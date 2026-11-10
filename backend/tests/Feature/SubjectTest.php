<?php

use App\Models\School;
use App\Models\Subject;
use App\Models\User;

function subjSchool(string $slug = 'north'): School
{
    return School::create(['name' => ucfirst($slug), 'slug' => $slug]);
}

function subjMember(School $school, string $role): User
{
    $user = User::factory()->create();
    $school->users()->attach($user, ['role' => $role]);

    return $user;
}

function subjSuper(): User
{
    return User::factory()->create(['is_super_admin' => true]);
}

function subjAdd(School $school, string $title, string $code, string $type = 'theory'): Subject
{
    return $school->subjects()->create(['title' => $title, 'code' => $code, 'type' => $type]);
}

function subjPayload(array $overrides = []): array
{
    return array_merge(['title' => 'Mathematics', 'code' => 'MATH', 'type' => 'theory'], $overrides);
}

// ---- List ----

it('lets a teacher list the subjects, ordered by title', function () {
    $school = subjSchool();
    subjAdd($school, 'Physics Lab', 'PHY-LAB', 'practical');
    subjAdd($school, 'Mathematics', 'MATH');
    subjAdd($school, 'English', 'ENG');
    $teacher = subjMember($school, 'teacher');

    $response = $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/schools/{$school->id}/subjects")
        ->assertOk()
        ->assertJsonCount(3, 'data');

    expect(collect($response->json('data'))->pluck('title')->all())
        ->toBe(['English', 'Mathematics', 'Physics Lab']);
    expect($response->json('data.2.code'))->toBe('PHY-LAB');
    expect($response->json('data.2.type'))->toBe('practical');
});

it('does not list the subjects of other schools', function () {
    $north = subjSchool('north');
    $south = subjSchool('south');
    subjAdd($north, 'Mathematics', 'MATH');
    subjAdd($south, 'Art', 'ART');
    $teacher = subjMember($north, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/schools/{$north->id}/subjects")
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.code', 'MATH');
});

it('blocks a non-member from listing subjects', function () {
    $school = subjSchool();

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson("/api/schools/{$school->id}/subjects")
        ->assertForbidden();
});

it('blocks guests from listing subjects', function () {
    $school = subjSchool();

    $this->getJson("/api/schools/{$school->id}/subjects")->assertUnauthorized();
});

it("lets a super admin list any school's subjects", function () {
    $school = subjSchool();
    subjAdd($school, 'Mathematics', 'MATH');

    $this->actingAs(subjSuper(), 'sanctum')
        ->getJson("/api/schools/{$school->id}/subjects")
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

// ---- Create ----

it('lets a school admin create a subject', function () {
    $school = subjSchool();
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/subjects", subjPayload())
        ->assertCreated()
        ->assertJsonPath('data.title', 'Mathematics')
        ->assertJsonPath('data.code', 'MATH')
        ->assertJsonPath('data.type', 'theory')
        ->assertJsonPath('data.status', 'active');

    $this->assertDatabaseHas('subjects', ['school_id' => $school->id, 'code' => 'MATH']);
});

it('uppercases and trims the code', function () {
    $school = subjSchool();
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/subjects", subjPayload(['code' => '  math-101 ']))
        ->assertCreated()
        ->assertJsonPath('data.code', 'MATH-101');
});

it('creates the subject in the school of the URL, whatever the body says', function () {
    $north = subjSchool('north');
    $south = subjSchool('south');
    $admin = subjMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$north->id}/subjects", subjPayload(['school_id' => $south->id]))
        ->assertCreated();

    expect(Subject::where('code', 'MATH')->first()->school_id)->toBe($north->id);
});

it('trims the title', function () {
    $school = subjSchool();
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/subjects", subjPayload(['title' => '  Mathematics  ']))
        ->assertCreated()
        ->assertJsonPath('data.title', 'Mathematics');
});

it('requires a title, a code and a type', function () {
    $school = subjSchool();
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/subjects", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['title', 'code', 'type']);
});

it('rejects a code that already exists in the school, ignoring case', function () {
    $school = subjSchool();
    subjAdd($school, 'Mathematics', 'MATH');
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/subjects", subjPayload(['title' => 'Maths', 'code' => 'math']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('code');

    expect($school->subjects()->count())->toBe(1);
});

it('allows the same code in a different school', function () {
    $north = subjSchool('north');
    $south = subjSchool('south');
    subjAdd($south, 'Mathematics', 'MATH');
    $admin = subjMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$north->id}/subjects", subjPayload())
        ->assertCreated();
});

it('allows two subjects with the same title but different codes', function () {
    $school = subjSchool();
    subjAdd($school, 'Mathematics', 'MATH');
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/subjects", subjPayload(['code' => 'MATH-P', 'type' => 'practical']))
        ->assertCreated();

    expect($school->subjects()->count())->toBe(2);
});

it('rejects invalid values', function (string $field, string $value) {
    $school = subjSchool();
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/subjects", subjPayload([$field => $value]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);

    expect($school->subjects()->count())->toBe(0);
})->with([
    'code with a space' => ['code', 'MATH 101'],
    'code starting with a dash' => ['code', '-MATH'],
    'code too long' => ['code', str_repeat('A', 31)],
    'unknown type' => ['type', 'elective'],
    'title too long' => ['title', str_repeat('a', 151)],
    'unknown status' => ['status', 'archived'],
]);

it('blocks a teacher from creating a subject', function () {
    $school = subjSchool();
    $teacher = subjMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->postJson("/api/schools/{$school->id}/subjects", subjPayload())
        ->assertForbidden();

    expect($school->subjects()->count())->toBe(0);
});

it('blocks the admin of another school from creating a subject', function () {
    $north = subjSchool('north');
    $south = subjSchool('south');
    $adminOfSouth = subjMember($south, 'admin');

    $this->actingAs($adminOfSouth, 'sanctum')
        ->postJson("/api/schools/{$north->id}/subjects", subjPayload())
        ->assertForbidden();

    expect($north->subjects()->count())->toBe(0);
});

it('blocks guests from creating a subject', function () {
    $school = subjSchool();

    $this->postJson("/api/schools/{$school->id}/subjects", subjPayload())->assertUnauthorized();
});

it('lets a super admin create a subject in any school', function () {
    $school = subjSchool();

    $this->actingAs(subjSuper(), 'sanctum')
        ->postJson("/api/schools/{$school->id}/subjects", subjPayload())
        ->assertCreated();
});

// ---- Show ----

it('shows a subject to a member', function () {
    $school = subjSchool();
    $subject = subjAdd($school, 'Mathematics', 'MATH');
    $teacher = subjMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/schools/{$school->id}/subjects/{$subject->id}")
        ->assertOk()
        ->assertJsonPath('data.code', 'MATH');
});

it("returns 404 for another school's subject", function () {
    $north = subjSchool('north');
    $south = subjSchool('south');
    $southSubject = subjAdd($south, 'Mathematics', 'MATH');
    $admin = subjMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->getJson("/api/schools/{$north->id}/subjects/{$southSubject->id}")
        ->assertNotFound();
});

it('forbids a non-member from viewing a subject', function () {
    $school = subjSchool();
    $subject = subjAdd($school, 'Mathematics', 'MATH');

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson("/api/schools/{$school->id}/subjects/{$subject->id}")
        ->assertForbidden();
});

// ---- Update ----

it('lets a school admin change the title and type', function () {
    $school = subjSchool();
    $subject = subjAdd($school, 'Mathematics', 'MATH');
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/subjects/{$subject->id}", ['title' => 'Maths', 'type' => 'practical'])
        ->assertOk()
        ->assertJsonPath('data.title', 'Maths')
        ->assertJsonPath('data.type', 'practical');

    expect($subject->fresh()->code)->toBe('MATH');
});

it('supports changing only the status', function () {
    $school = subjSchool();
    $subject = subjAdd($school, 'Mathematics', 'MATH');
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/subjects/{$subject->id}", ['status' => 'inactive'])
        ->assertOk()
        ->assertJsonPath('data.title', 'Mathematics')
        ->assertJsonPath('data.status', 'inactive');
});

it('lets an update keep the same code', function () {
    $school = subjSchool();
    $subject = subjAdd($school, 'Mathematics', 'MATH');
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->putJson("/api/schools/{$school->id}/subjects/{$subject->id}", subjPayload(['status' => 'inactive']))
        ->assertOk();
});

it('rejects a code used by another subject', function () {
    $school = subjSchool();
    subjAdd($school, 'Mathematics', 'MATH');
    $english = subjAdd($school, 'English', 'ENG');
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/subjects/{$english->id}", ['code' => 'math'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('code');

    expect($english->fresh()->code)->toBe('ENG');
});

it('uppercases the code on update', function () {
    $school = subjSchool();
    $subject = subjAdd($school, 'Mathematics', 'MATH');
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/subjects/{$subject->id}", ['code' => 'new-1'])
        ->assertOk()
        ->assertJsonPath('data.code', 'NEW-1');
});

it("returns 404 when updating another school's subject", function () {
    $north = subjSchool('north');
    $south = subjSchool('south');
    $southSubject = subjAdd($south, 'Mathematics', 'MATH');
    $admin = subjMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$north->id}/subjects/{$southSubject->id}", ['title' => 'Hacked'])
        ->assertNotFound();

    expect($southSubject->fresh()->title)->toBe('Mathematics');
});

it('blocks a teacher from updating a subject', function () {
    $school = subjSchool();
    $subject = subjAdd($school, 'Mathematics', 'MATH');
    $teacher = subjMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/subjects/{$subject->id}", ['title' => 'Hacked'])
        ->assertForbidden();

    expect($subject->fresh()->title)->toBe('Mathematics');
});

it('blocks guests from updating a subject', function () {
    $school = subjSchool();
    $subject = subjAdd($school, 'Mathematics', 'MATH');

    $this->patchJson("/api/schools/{$school->id}/subjects/{$subject->id}", ['title' => 'Hacked'])
        ->assertUnauthorized();
});

// ---- Delete ----

it('lets a school admin delete a subject', function () {
    $school = subjSchool();
    $subject = subjAdd($school, 'Mathematics', 'MATH');
    $admin = subjMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/subjects/{$subject->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('subjects', ['id' => $subject->id]);
});

it("returns 404 when deleting another school's subject", function () {
    $north = subjSchool('north');
    $south = subjSchool('south');
    $southSubject = subjAdd($south, 'Mathematics', 'MATH');
    $admin = subjMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$north->id}/subjects/{$southSubject->id}")
        ->assertNotFound();

    $this->assertDatabaseHas('subjects', ['id' => $southSubject->id]);
});

it('blocks a teacher from deleting a subject', function () {
    $school = subjSchool();
    $subject = subjAdd($school, 'Mathematics', 'MATH');
    $teacher = subjMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/subjects/{$subject->id}")
        ->assertForbidden();

    $this->assertDatabaseHas('subjects', ['id' => $subject->id]);
});

it('blocks the admin of another school from deleting a subject', function () {
    $north = subjSchool('north');
    $south = subjSchool('south');
    $northSubject = subjAdd($north, 'Mathematics', 'MATH');
    $adminOfSouth = subjMember($south, 'admin');

    $this->actingAs($adminOfSouth, 'sanctum')
        ->deleteJson("/api/schools/{$north->id}/subjects/{$northSubject->id}")
        ->assertForbidden();

    $this->assertDatabaseHas('subjects', ['id' => $northSubject->id]);
});

it('blocks guests from deleting a subject', function () {
    $school = subjSchool();
    $subject = subjAdd($school, 'Mathematics', 'MATH');

    $this->deleteJson("/api/schools/{$school->id}/subjects/{$subject->id}")->assertUnauthorized();

    $this->assertDatabaseHas('subjects', ['id' => $subject->id]);
});

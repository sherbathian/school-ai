<?php

use App\Models\School;
use App\Models\Section;
use App\Models\User;

function secSchool(string $slug = 'north'): School
{
    return School::create(['name' => ucfirst($slug), 'slug' => $slug]);
}

function secMember(School $school, string $role): User
{
    $user = User::factory()->create();
    $school->users()->attach($user, ['role' => $role]);

    return $user;
}

function secSuper(): User
{
    return User::factory()->create(['is_super_admin' => true]);
}

function secAdd(School $school, string $title): Section
{
    return $school->sections()->create(['title' => $title]);
}

// ---- List ----

it('lets a teacher list the sections, ordered by title', function () {
    $school = secSchool();
    secAdd($school, 'B');
    secAdd($school, 'A');
    secAdd($school, 'C');
    $teacher = secMember($school, 'teacher');

    $response = $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/schools/{$school->id}/sections")
        ->assertOk()
        ->assertJsonCount(3, 'data');

    expect(collect($response->json('data'))->pluck('title')->all())->toBe(['A', 'B', 'C']);
});

it('does not list the sections of other schools', function () {
    $north = secSchool('north');
    $south = secSchool('south');
    secAdd($north, 'A');
    secAdd($south, 'B');
    $teacher = secMember($north, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/schools/{$north->id}/sections")
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'A');
});

it('blocks a non-member from listing sections', function () {
    $school = secSchool();

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson("/api/schools/{$school->id}/sections")
        ->assertForbidden();
});

it('blocks guests from listing sections', function () {
    $school = secSchool();

    $this->getJson("/api/schools/{$school->id}/sections")->assertUnauthorized();
});

it("lets a super admin list any school's sections", function () {
    $school = secSchool();
    secAdd($school, 'A');

    $this->actingAs(secSuper(), 'sanctum')
        ->getJson("/api/schools/{$school->id}/sections")
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

// ---- Create ----

it('lets a school admin create a section', function () {
    $school = secSchool();
    $admin = secMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/sections", ['title' => 'A'])
        ->assertCreated()
        ->assertJsonPath('data.title', 'A')
        ->assertJsonPath('data.status', 'active');

    $this->assertDatabaseHas('sections', ['school_id' => $school->id, 'title' => 'A']);
});

it('creates the section in the school of the URL, whatever the body says', function () {
    $north = secSchool('north');
    $south = secSchool('south');
    $admin = secMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$north->id}/sections", ['title' => 'A', 'school_id' => $south->id])
        ->assertCreated();

    expect(Section::where('title', 'A')->first()->school_id)->toBe($north->id);
});

it('trims the title', function () {
    $school = secSchool();
    $admin = secMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/sections", ['title' => '  A  '])
        ->assertCreated()
        ->assertJsonPath('data.title', 'A');
});

it('rejects a missing title', function () {
    $school = secSchool();
    $admin = secMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/sections", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');
});

it('rejects a title that is too long', function () {
    $school = secSchool();
    $admin = secMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/sections", ['title' => str_repeat('a', 101)])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');
});

it('rejects a title that already exists in the school', function () {
    $school = secSchool();
    secAdd($school, 'A');
    $admin = secMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/sections", ['title' => 'A'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');

    expect($school->sections()->count())->toBe(1);
});

it('allows the same title in a different school', function () {
    $north = secSchool('north');
    $south = secSchool('south');
    secAdd($south, 'A');
    $admin = secMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$north->id}/sections", ['title' => 'A'])
        ->assertCreated();
});

it('rejects an unknown status', function () {
    $school = secSchool();
    $admin = secMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/sections", ['title' => 'A', 'status' => 'archived'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');
});

it('blocks a teacher from creating a section', function () {
    $school = secSchool();
    $teacher = secMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->postJson("/api/schools/{$school->id}/sections", ['title' => 'A'])
        ->assertForbidden();

    expect($school->sections()->count())->toBe(0);
});

it('blocks the admin of another school from creating a section', function () {
    $north = secSchool('north');
    $south = secSchool('south');
    $adminOfSouth = secMember($south, 'admin');

    $this->actingAs($adminOfSouth, 'sanctum')
        ->postJson("/api/schools/{$north->id}/sections", ['title' => 'A'])
        ->assertForbidden();

    expect($north->sections()->count())->toBe(0);
});

it('blocks guests from creating a section', function () {
    $school = secSchool();

    $this->postJson("/api/schools/{$school->id}/sections", ['title' => 'A'])->assertUnauthorized();
});

it('lets a super admin create a section in any school', function () {
    $school = secSchool();

    $this->actingAs(secSuper(), 'sanctum')
        ->postJson("/api/schools/{$school->id}/sections", ['title' => 'A'])
        ->assertCreated();
});

// ---- Show ----

it('shows a section to a member', function () {
    $school = secSchool();
    $section = secAdd($school, 'A');
    $teacher = secMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/schools/{$school->id}/sections/{$section->id}")
        ->assertOk()
        ->assertJsonPath('data.title', 'A');
});

it("returns 404 for another school's section", function () {
    $north = secSchool('north');
    $south = secSchool('south');
    $southSection = secAdd($south, 'A');
    $admin = secMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->getJson("/api/schools/{$north->id}/sections/{$southSection->id}")
        ->assertNotFound();
});

it('forbids a non-member from viewing a section', function () {
    $school = secSchool();
    $section = secAdd($school, 'A');

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson("/api/schools/{$school->id}/sections/{$section->id}")
        ->assertForbidden();
});

// ---- Update ----

it('lets a school admin rename a section', function () {
    $school = secSchool();
    $section = secAdd($school, 'A');
    $admin = secMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/sections/{$section->id}", ['title' => 'Alpha'])
        ->assertOk()
        ->assertJsonPath('data.title', 'Alpha');

    expect($section->fresh()->title)->toBe('Alpha');
});

it('supports changing only the status', function () {
    $school = secSchool();
    $section = secAdd($school, 'A');
    $admin = secMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/sections/{$section->id}", ['status' => 'inactive'])
        ->assertOk()
        ->assertJsonPath('data.title', 'A')
        ->assertJsonPath('data.status', 'inactive');
});

it('lets an update keep the same title', function () {
    $school = secSchool();
    $section = secAdd($school, 'A');
    $admin = secMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->putJson("/api/schools/{$school->id}/sections/{$section->id}", ['title' => 'A', 'status' => 'inactive'])
        ->assertOk();
});

it("rejects renaming a section to another section's title", function () {
    $school = secSchool();
    secAdd($school, 'A');
    $b = secAdd($school, 'B');
    $admin = secMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/sections/{$b->id}", ['title' => 'A'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');

    expect($b->fresh()->title)->toBe('B');
});

it("returns 404 when updating another school's section", function () {
    $north = secSchool('north');
    $south = secSchool('south');
    $southSection = secAdd($south, 'A');
    $admin = secMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$north->id}/sections/{$southSection->id}", ['title' => 'Hacked'])
        ->assertNotFound();

    expect($southSection->fresh()->title)->toBe('A');
});

it('blocks a teacher from updating a section', function () {
    $school = secSchool();
    $section = secAdd($school, 'A');
    $teacher = secMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/sections/{$section->id}", ['title' => 'Hacked'])
        ->assertForbidden();

    expect($section->fresh()->title)->toBe('A');
});

it('blocks guests from updating a section', function () {
    $school = secSchool();
    $section = secAdd($school, 'A');

    $this->patchJson("/api/schools/{$school->id}/sections/{$section->id}", ['title' => 'Hacked'])
        ->assertUnauthorized();
});

// ---- Delete ----

it('lets a school admin delete a section', function () {
    $school = secSchool();
    $section = secAdd($school, 'A');
    $admin = secMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/sections/{$section->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('sections', ['id' => $section->id]);
});

it("returns 404 when deleting another school's section", function () {
    $north = secSchool('north');
    $south = secSchool('south');
    $southSection = secAdd($south, 'A');
    $admin = secMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$north->id}/sections/{$southSection->id}")
        ->assertNotFound();

    $this->assertDatabaseHas('sections', ['id' => $southSection->id]);
});

it('blocks a teacher from deleting a section', function () {
    $school = secSchool();
    $section = secAdd($school, 'A');
    $teacher = secMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/sections/{$section->id}")
        ->assertForbidden();

    $this->assertDatabaseHas('sections', ['id' => $section->id]);
});

it('blocks the admin of another school from deleting a section', function () {
    $north = secSchool('north');
    $south = secSchool('south');
    $northSection = secAdd($north, 'A');
    $adminOfSouth = secMember($south, 'admin');

    $this->actingAs($adminOfSouth, 'sanctum')
        ->deleteJson("/api/schools/{$north->id}/sections/{$northSection->id}")
        ->assertForbidden();

    $this->assertDatabaseHas('sections', ['id' => $northSection->id]);
});

it('blocks guests from deleting a section', function () {
    $school = secSchool();
    $section = secAdd($school, 'A');

    $this->deleteJson("/api/schools/{$school->id}/sections/{$section->id}")->assertUnauthorized();

    $this->assertDatabaseHas('sections', ['id' => $section->id]);
});

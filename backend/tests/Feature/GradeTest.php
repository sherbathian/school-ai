<?php

use App\Models\Grade;
use App\Models\School;
use App\Models\Section;
use App\Models\User;

function gradSchool(string $slug = 'north'): School
{
    return School::create(['name' => ucfirst($slug), 'slug' => $slug]);
}

function gradMember(School $school, string $role): User
{
    $user = User::factory()->create();
    $school->users()->attach($user, ['role' => $role]);

    return $user;
}

function gradSuper(): User
{
    return User::factory()->create(['is_super_admin' => true]);
}

function gradSection(School $school, string $title): Section
{
    return $school->sections()->create(['title' => $title]);
}

function gradAdd(School $school, string $title, array $sections = []): Grade
{
    $grade = $school->grades()->create(['title' => $title]);
    $grade->sections()->sync(collect($sections)->pluck('id')->all());

    return $grade;
}

// ---- List ----

it('lets a teacher list the grades, ordered by title, with their sections', function () {
    $school = gradSchool();
    $a = gradSection($school, 'A');
    $b = gradSection($school, 'B');
    gradAdd($school, 'Grade 2', [$a]);
    gradAdd($school, 'Grade 1', [$b, $a]);
    $teacher = gradMember($school, 'teacher');

    $response = $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/schools/{$school->id}/grades")
        ->assertOk()
        ->assertJsonCount(2, 'data');

    expect(collect($response->json('data'))->pluck('title')->all())->toBe(['Grade 1', 'Grade 2']);
    expect(collect($response->json('data.0.sections'))->pluck('title')->all())->toBe(['A', 'B']);
});

it('does not list the grades of other schools', function () {
    $north = gradSchool('north');
    $south = gradSchool('south');
    gradAdd($north, 'Grade 1');
    gradAdd($south, 'Grade 9');
    $teacher = gradMember($north, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/schools/{$north->id}/grades")
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Grade 1');
});

it('blocks a non-member from listing grades', function () {
    $school = gradSchool();

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson("/api/schools/{$school->id}/grades")
        ->assertForbidden();
});

it('blocks guests from listing grades', function () {
    $school = gradSchool();

    $this->getJson("/api/schools/{$school->id}/grades")->assertUnauthorized();
});

it("lets a super admin list any school's grades", function () {
    $school = gradSchool();
    gradAdd($school, 'Grade 1');

    $this->actingAs(gradSuper(), 'sanctum')
        ->getJson("/api/schools/{$school->id}/grades")
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

// ---- Create ----

it('lets a school admin create a grade', function () {
    $school = gradSchool();
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/grades", ['title' => 'Grade 1'])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Grade 1')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonCount(0, 'data.sections');

    $this->assertDatabaseHas('grades', ['school_id' => $school->id, 'title' => 'Grade 1']);
});

it('creates a grade with its sections', function () {
    $school = gradSchool();
    $a = gradSection($school, 'A');
    gradSection($school, 'B');
    $c = gradSection($school, 'C');
    $admin = gradMember($school, 'admin');

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/grades", [
            'title' => 'Grade 1',
            'section_ids' => [$c->id, $a->id],
        ])
        ->assertCreated();

    expect(collect($response->json('data.sections'))->pluck('title')->all())->toBe(['A', 'C']);

    $grade = Grade::where('title', 'Grade 1')->first();
    expect($grade->sections()->pluck('sections.id')->sort()->values()->all())->toBe([$a->id, $c->id]);
});

it('creates the grade in the school of the URL, whatever the body says', function () {
    $north = gradSchool('north');
    $south = gradSchool('south');
    $admin = gradMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$north->id}/grades", ['title' => 'Grade 1', 'school_id' => $south->id])
        ->assertCreated();

    expect(Grade::where('title', 'Grade 1')->first()->school_id)->toBe($north->id);
});

it('trims the title', function () {
    $school = gradSchool();
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/grades", ['title' => '  Grade 1  '])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Grade 1');
});

it('rejects a missing title', function () {
    $school = gradSchool();
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/grades", [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');
});

it('rejects a title that already exists in the school', function () {
    $school = gradSchool();
    gradAdd($school, 'Grade 1');
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/grades", ['title' => 'Grade 1'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');

    expect($school->grades()->count())->toBe(1);
});

it('allows the same title in a different school', function () {
    $north = gradSchool('north');
    $south = gradSchool('south');
    gradAdd($south, 'Grade 1');
    $admin = gradMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$north->id}/grades", ['title' => 'Grade 1'])
        ->assertCreated();
});

it('rejects an unknown status', function () {
    $school = gradSchool();
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/grades", ['title' => 'Grade 1', 'status' => 'archived'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('status');
});

it("rejects a section from another school and creates nothing", function () {
    $north = gradSchool('north');
    $south = gradSchool('south');
    $southSection = gradSection($south, 'A');
    $admin = gradMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$north->id}/grades", [
            'title' => 'Grade 1',
            'section_ids' => [$southSection->id],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('section_ids.0');

    expect($north->grades()->count())->toBe(0);
});

it('rejects a section that does not exist', function () {
    $school = gradSchool();
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/grades", ['title' => 'Grade 1', 'section_ids' => [9999]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('section_ids.0');
});

it('rejects the same section twice', function () {
    $school = gradSchool();
    $a = gradSection($school, 'A');
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/grades", [
            'title' => 'Grade 1',
            'section_ids' => [$a->id, $a->id],
        ])
        ->assertUnprocessable();

    expect($school->grades()->count())->toBe(0);
});

it('blocks a teacher from creating a grade', function () {
    $school = gradSchool();
    $teacher = gradMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->postJson("/api/schools/{$school->id}/grades", ['title' => 'Grade 1'])
        ->assertForbidden();

    expect($school->grades()->count())->toBe(0);
});

it('blocks the admin of another school from creating a grade', function () {
    $north = gradSchool('north');
    $south = gradSchool('south');
    $adminOfSouth = gradMember($south, 'admin');

    $this->actingAs($adminOfSouth, 'sanctum')
        ->postJson("/api/schools/{$north->id}/grades", ['title' => 'Grade 1'])
        ->assertForbidden();

    expect($north->grades()->count())->toBe(0);
});

it('blocks guests from creating a grade', function () {
    $school = gradSchool();

    $this->postJson("/api/schools/{$school->id}/grades", ['title' => 'Grade 1'])->assertUnauthorized();
});

it('lets a super admin create a grade in any school', function () {
    $school = gradSchool();

    $this->actingAs(gradSuper(), 'sanctum')
        ->postJson("/api/schools/{$school->id}/grades", ['title' => 'Grade 1'])
        ->assertCreated();
});

// ---- Show ----

it('shows a grade with its sections to a member', function () {
    $school = gradSchool();
    $a = gradSection($school, 'A');
    $grade = gradAdd($school, 'Grade 1', [$a]);
    $teacher = gradMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/schools/{$school->id}/grades/{$grade->id}")
        ->assertOk()
        ->assertJsonPath('data.title', 'Grade 1')
        ->assertJsonPath('data.sections.0.title', 'A');
});

it("returns 404 for another school's grade", function () {
    $north = gradSchool('north');
    $south = gradSchool('south');
    $southGrade = gradAdd($south, 'Grade 1');
    $admin = gradMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->getJson("/api/schools/{$north->id}/grades/{$southGrade->id}")
        ->assertNotFound();
});

// ---- Update ----

it('renames a grade and leaves its sections alone when none are sent', function () {
    $school = gradSchool();
    $a = gradSection($school, 'A');
    $grade = gradAdd($school, 'Grade 1', [$a]);
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/grades/{$grade->id}", ['title' => 'First'])
        ->assertOk()
        ->assertJsonPath('data.title', 'First')
        ->assertJsonCount(1, 'data.sections');

    expect($grade->sections()->count())->toBe(1);
});

it("replaces the grade's sections with the list that is sent", function () {
    $school = gradSchool();
    $a = gradSection($school, 'A');
    $b = gradSection($school, 'B');
    $c = gradSection($school, 'C');
    $grade = gradAdd($school, 'Grade 1', [$a, $b]);
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/grades/{$grade->id}", ['section_ids' => [$b->id, $c->id]])
        ->assertOk();

    expect($grade->sections()->pluck('sections.id')->sort()->values()->all())->toBe([$b->id, $c->id]);
});

it('clears the sections when an empty list is sent', function () {
    $school = gradSchool();
    $a = gradSection($school, 'A');
    $grade = gradAdd($school, 'Grade 1', [$a]);
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/grades/{$grade->id}", ['section_ids' => []])
        ->assertOk()
        ->assertJsonCount(0, 'data.sections');

    expect($grade->sections()->count())->toBe(0);
});

it("rejects another school's section on update and changes nothing", function () {
    $north = gradSchool('north');
    $south = gradSchool('south');
    $a = gradSection($north, 'A');
    $southSection = gradSection($south, 'A');
    $grade = gradAdd($north, 'Grade 1', [$a]);
    $admin = gradMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$north->id}/grades/{$grade->id}", [
            'title' => 'Changed',
            'section_ids' => [$southSection->id],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('section_ids.0');

    expect($grade->fresh()->title)->toBe('Grade 1');
    expect($grade->sections()->pluck('sections.id')->all())->toBe([$a->id]);
});

it("rejects renaming a grade to another grade's title", function () {
    $school = gradSchool();
    gradAdd($school, 'Grade 1');
    $two = gradAdd($school, 'Grade 2');
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/grades/{$two->id}", ['title' => 'Grade 1'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');

    expect($two->fresh()->title)->toBe('Grade 2');
});

it('lets an update keep the same title', function () {
    $school = gradSchool();
    $grade = gradAdd($school, 'Grade 1');
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->putJson("/api/schools/{$school->id}/grades/{$grade->id}", ['title' => 'Grade 1', 'status' => 'inactive'])
        ->assertOk()
        ->assertJsonPath('data.status', 'inactive');
});

it("returns 404 when updating another school's grade", function () {
    $north = gradSchool('north');
    $south = gradSchool('south');
    $southGrade = gradAdd($south, 'Grade 1');
    $admin = gradMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$north->id}/grades/{$southGrade->id}", ['title' => 'Hacked'])
        ->assertNotFound();

    expect($southGrade->fresh()->title)->toBe('Grade 1');
});

it('blocks a teacher from updating a grade', function () {
    $school = gradSchool();
    $grade = gradAdd($school, 'Grade 1');
    $teacher = gradMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/grades/{$grade->id}", ['title' => 'Hacked'])
        ->assertForbidden();

    expect($grade->fresh()->title)->toBe('Grade 1');
});

it('blocks guests from updating a grade', function () {
    $school = gradSchool();
    $grade = gradAdd($school, 'Grade 1');

    $this->patchJson("/api/schools/{$school->id}/grades/{$grade->id}", ['title' => 'Hacked'])
        ->assertUnauthorized();
});

// ---- Delete ----

it('deletes a grade and its assignments but keeps the sections', function () {
    $school = gradSchool();
    $a = gradSection($school, 'A');
    $grade = gradAdd($school, 'Grade 1', [$a]);
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/grades/{$grade->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('grades', ['id' => $grade->id]);
    $this->assertDatabaseMissing('grade_section', ['grade_id' => $grade->id]);
    $this->assertDatabaseHas('sections', ['id' => $a->id]);
});

it("returns 404 when deleting another school's grade", function () {
    $north = gradSchool('north');
    $south = gradSchool('south');
    $southGrade = gradAdd($south, 'Grade 1');
    $admin = gradMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$north->id}/grades/{$southGrade->id}")
        ->assertNotFound();

    $this->assertDatabaseHas('grades', ['id' => $southGrade->id]);
});

it('blocks a teacher from deleting a grade', function () {
    $school = gradSchool();
    $grade = gradAdd($school, 'Grade 1');
    $teacher = gradMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/grades/{$grade->id}")
        ->assertForbidden();

    $this->assertDatabaseHas('grades', ['id' => $grade->id]);
});

it('blocks guests from deleting a grade', function () {
    $school = gradSchool();
    $grade = gradAdd($school, 'Grade 1');

    $this->deleteJson("/api/schools/{$school->id}/grades/{$grade->id}")->assertUnauthorized();

    $this->assertDatabaseHas('grades', ['id' => $grade->id]);
});

// ---- Sections that grades use ----

it('refuses to delete a section that a grade uses', function () {
    $school = gradSchool();
    $a = gradSection($school, 'A');
    gradAdd($school, 'Grade 1', [$a]);
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/sections/{$a->id}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('section');

    $this->assertDatabaseHas('sections', ['id' => $a->id]);
});

it('allows deleting a section once no grade uses it', function () {
    $school = gradSchool();
    $a = gradSection($school, 'A');
    $grade = gradAdd($school, 'Grade 1', [$a]);
    $grade->sections()->sync([]);
    $admin = gradMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/sections/{$a->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('sections', ['id' => $a->id]);
});

<?php

use App\Models\Grade;
use App\Models\School;
use App\Models\Section;
use App\Models\Subject;
use App\Models\SubjectGroup;
use App\Models\User;

function sgSchool(string $slug = 'north'): School
{
    return School::create(['name' => ucfirst($slug), 'slug' => $slug]);
}

function sgMember(School $school, string $role): User
{
    $user = User::factory()->create();
    $school->users()->attach($user, ['role' => $role]);

    return $user;
}

function sgSuper(): User
{
    return User::factory()->create(['is_super_admin' => true]);
}

function sgSection(School $school, string $title): Section
{
    return $school->sections()->create(['title' => $title]);
}

function sgSubject(School $school, string $title, string $code, string $type = 'theory'): Subject
{
    return $school->subjects()->create(['title' => $title, 'code' => $code, 'type' => $type]);
}

function sgGrade(School $school, string $title, array $sections = []): Grade
{
    $grade = $school->grades()->create(['title' => $title]);
    $grade->sections()->sync(collect($sections)->pluck('id')->all());

    return $grade;
}

function sgGroup(School $school, Grade $grade, string $title, array $sections = [], array $subjects = []): SubjectGroup
{
    $group = $school->subjectGroups()->create(['grade_id' => $grade->id, 'title' => $title]);
    $group->sections()->sync(collect($sections)->pluck('id')->all());
    $group->subjects()->sync(collect($subjects)->pluck('id')->all());

    return $group;
}

function sgUrl(School $school, ?SubjectGroup $group = null): string
{
    return "/api/schools/{$school->id}/subject-groups" . ($group ? "/{$group->id}" : '');
}

// ---- List ----

it('lets a teacher list the groups with their grade, sections and subjects', function () {
    $school = sgSchool();
    $a = sgSection($school, 'A');
    $math = sgSubject($school, 'Mathematics', 'MATH');
    $grade = sgGrade($school, 'Grade 1', [$a]);
    sgGroup($school, $grade, 'Science', [$a], [$math]);
    sgGroup($school, $grade, 'Arts');
    $teacher = sgMember($school, 'teacher');

    $response = $this->actingAs($teacher, 'sanctum')
        ->getJson(sgUrl($school))
        ->assertOk()
        ->assertJsonCount(2, 'data');

    expect(collect($response->json('data'))->pluck('title')->all())->toBe(['Arts', 'Science']);
    expect($response->json('data.1.grade.title'))->toBe('Grade 1');
    expect(collect($response->json('data.1.sections'))->pluck('title')->all())->toBe(['A']);
    expect(collect($response->json('data.1.subjects'))->pluck('code')->all())->toBe(['MATH']);
});

it('does not list the groups of other schools', function () {
    $north = sgSchool('north');
    $south = sgSchool('south');
    sgGroup($north, sgGrade($north, 'Grade 1'), 'Science');
    sgGroup($south, sgGrade($south, 'Grade 9'), 'Arts');
    $teacher = sgMember($north, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->getJson(sgUrl($north))
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Science');
});

it('blocks a non-member from listing groups', function () {
    $school = sgSchool();

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson(sgUrl($school))
        ->assertForbidden();
});

it('blocks guests from listing groups', function () {
    $school = sgSchool();

    $this->getJson(sgUrl($school))->assertUnauthorized();
});

it("lets a super admin list any school's groups", function () {
    $school = sgSchool();
    sgGroup($school, sgGrade($school, 'Grade 1'), 'Science');

    $this->actingAs(sgSuper(), 'sanctum')
        ->getJson(sgUrl($school))
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

// ---- Create ----

it('lets a school admin create a group with sections and subjects', function () {
    $school = sgSchool();
    $a = sgSection($school, 'A');
    $b = sgSection($school, 'B');
    $math = sgSubject($school, 'Mathematics', 'MATH');
    $english = sgSubject($school, 'English', 'ENG');
    $grade = sgGrade($school, 'Grade 1', [$a, $b]);
    $admin = sgMember($school, 'admin');

    $response = $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($school), [
            'grade_id' => $grade->id,
            'title' => 'Core',
            'description' => 'Compulsory subjects.',
            'section_ids' => [$b->id, $a->id],
            'subject_ids' => [$english->id, $math->id],
        ])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Core')
        ->assertJsonPath('data.description', 'Compulsory subjects.')
        ->assertJsonPath('data.grade.title', 'Grade 1');

    expect(collect($response->json('data.sections'))->pluck('title')->all())->toBe(['A', 'B']);
    expect(collect($response->json('data.subjects'))->pluck('code')->all())->toBe(['ENG', 'MATH']);

    $this->assertDatabaseHas('subject_groups', [
        'school_id' => $school->id,
        'grade_id' => $grade->id,
        'title' => 'Core',
    ]);
});

it('creates a group without sections or subjects', function () {
    $school = sgSchool();
    $grade = sgGrade($school, 'Grade 1');
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($school), ['grade_id' => $grade->id, 'title' => 'Core'])
        ->assertCreated()
        ->assertJsonCount(0, 'data.sections')
        ->assertJsonCount(0, 'data.subjects');
});

it('creates the group in the school of the URL, whatever the body says', function () {
    $north = sgSchool('north');
    $south = sgSchool('south');
    $grade = sgGrade($north, 'Grade 1');
    $admin = sgMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($north), ['grade_id' => $grade->id, 'title' => 'Core', 'school_id' => $south->id])
        ->assertCreated();

    expect(SubjectGroup::where('title', 'Core')->first()->school_id)->toBe($north->id);
});

it('requires a title and a grade', function () {
    $school = sgSchool();
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($school), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['title', 'grade_id']);
});

it('rejects a grade from another school', function () {
    $north = sgSchool('north');
    $south = sgSchool('south');
    $southGrade = sgGrade($south, 'Grade 1');
    $admin = sgMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($north), ['grade_id' => $southGrade->id, 'title' => 'Core'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('grade_id');

    expect($north->subjectGroups()->count())->toBe(0);
});

it("rejects a section that is not one of the group's grade's sections", function () {
    $school = sgSchool();
    $a = sgSection($school, 'A');
    $b = sgSection($school, 'B'); // exists in the school, but Grade 1 does not have it
    $grade = sgGrade($school, 'Grade 1', [$a]);
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($school), ['grade_id' => $grade->id, 'title' => 'Core', 'section_ids' => [$b->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('section_ids.0');

    expect($school->subjectGroups()->count())->toBe(0);
});

it('rejects a section from another school', function () {
    $north = sgSchool('north');
    $south = sgSchool('south');
    $a = sgSection($north, 'A');
    $southSection = sgSection($south, 'A');
    $grade = sgGrade($north, 'Grade 1', [$a]);
    $admin = sgMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($north), ['grade_id' => $grade->id, 'title' => 'Core', 'section_ids' => [$southSection->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('section_ids.0');
});

it('rejects a subject from another school', function () {
    $north = sgSchool('north');
    $south = sgSchool('south');
    $grade = sgGrade($north, 'Grade 1');
    $southSubject = sgSubject($south, 'Art', 'ART');
    $admin = sgMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($north), ['grade_id' => $grade->id, 'title' => 'Core', 'subject_ids' => [$southSubject->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('subject_ids.0');

    expect($north->subjectGroups()->count())->toBe(0);
});

it('rejects the same subject twice', function () {
    $school = sgSchool();
    $grade = sgGrade($school, 'Grade 1');
    $math = sgSubject($school, 'Mathematics', 'MATH');
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($school), ['grade_id' => $grade->id, 'title' => 'Core', 'subject_ids' => [$math->id, $math->id]])
        ->assertUnprocessable();

    expect($school->subjectGroups()->count())->toBe(0);
});

it('rejects a title already used in the same grade', function () {
    $school = sgSchool();
    $grade = sgGrade($school, 'Grade 1');
    sgGroup($school, $grade, 'Core');
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($school), ['grade_id' => $grade->id, 'title' => 'Core'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');

    expect($school->subjectGroups()->count())->toBe(1);
});

it('allows the same title in another grade', function () {
    $school = sgSchool();
    $one = sgGrade($school, 'Grade 1');
    $two = sgGrade($school, 'Grade 2');
    sgGroup($school, $one, 'Core');
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($school), ['grade_id' => $two->id, 'title' => 'Core'])
        ->assertCreated();
});

it('allows the same title in another school', function () {
    $north = sgSchool('north');
    $south = sgSchool('south');
    sgGroup($south, sgGrade($south, 'Grade 1'), 'Core');
    $grade = sgGrade($north, 'Grade 1');
    $admin = sgMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($north), ['grade_id' => $grade->id, 'title' => 'Core'])
        ->assertCreated();
});

it('rejects a title that is too long', function () {
    $school = sgSchool();
    $grade = sgGrade($school, 'Grade 1');
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson(sgUrl($school), ['grade_id' => $grade->id, 'title' => str_repeat('a', 151)])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');
});

it('blocks a teacher from creating a group', function () {
    $school = sgSchool();
    $grade = sgGrade($school, 'Grade 1');
    $teacher = sgMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->postJson(sgUrl($school), ['grade_id' => $grade->id, 'title' => 'Core'])
        ->assertForbidden();

    expect($school->subjectGroups()->count())->toBe(0);
});

it('blocks the admin of another school from creating a group', function () {
    $north = sgSchool('north');
    $south = sgSchool('south');
    $grade = sgGrade($north, 'Grade 1');
    $adminOfSouth = sgMember($south, 'admin');

    $this->actingAs($adminOfSouth, 'sanctum')
        ->postJson(sgUrl($north), ['grade_id' => $grade->id, 'title' => 'Core'])
        ->assertForbidden();

    expect($north->subjectGroups()->count())->toBe(0);
});

it('blocks guests from creating a group', function () {
    $school = sgSchool();
    $grade = sgGrade($school, 'Grade 1');

    $this->postJson(sgUrl($school), ['grade_id' => $grade->id, 'title' => 'Core'])->assertUnauthorized();
});

it('lets a super admin create a group in any school', function () {
    $school = sgSchool();
    $grade = sgGrade($school, 'Grade 1');

    $this->actingAs(sgSuper(), 'sanctum')
        ->postJson(sgUrl($school), ['grade_id' => $grade->id, 'title' => 'Core'])
        ->assertCreated();
});

// ---- Show ----

it('shows a group with its grade, sections and subjects to a member', function () {
    $school = sgSchool();
    $a = sgSection($school, 'A');
    $math = sgSubject($school, 'Mathematics', 'MATH');
    $grade = sgGrade($school, 'Grade 1', [$a]);
    $group = sgGroup($school, $grade, 'Core', [$a], [$math]);
    $teacher = sgMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->getJson(sgUrl($school, $group))
        ->assertOk()
        ->assertJsonPath('data.title', 'Core')
        ->assertJsonPath('data.grade.title', 'Grade 1')
        ->assertJsonPath('data.sections.0.title', 'A')
        ->assertJsonPath('data.subjects.0.code', 'MATH');
});

it("returns 404 for another school's group", function () {
    $north = sgSchool('north');
    $south = sgSchool('south');
    $southGroup = sgGroup($south, sgGrade($south, 'Grade 1'), 'Core');
    $admin = sgMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->getJson("/api/schools/{$north->id}/subject-groups/{$southGroup->id}")
        ->assertNotFound();
});

// ---- Update ----

it('changes the title and description and leaves the lists alone when none are sent', function () {
    $school = sgSchool();
    $a = sgSection($school, 'A');
    $math = sgSubject($school, 'Mathematics', 'MATH');
    $grade = sgGrade($school, 'Grade 1', [$a]);
    $group = sgGroup($school, $grade, 'Core', [$a], [$math]);
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson(sgUrl($school, $group), ['title' => 'Compulsory', 'description' => 'Updated'])
        ->assertOk()
        ->assertJsonPath('data.title', 'Compulsory')
        ->assertJsonPath('data.description', 'Updated')
        ->assertJsonCount(1, 'data.sections')
        ->assertJsonCount(1, 'data.subjects');
});

it('replaces the sections and subjects with the lists that are sent', function () {
    $school = sgSchool();
    $a = sgSection($school, 'A');
    $b = sgSection($school, 'B');
    $c = sgSection($school, 'C');
    $math = sgSubject($school, 'Mathematics', 'MATH');
    $english = sgSubject($school, 'English', 'ENG');
    $grade = sgGrade($school, 'Grade 1', [$a, $b, $c]);
    $group = sgGroup($school, $grade, 'Core', [$a], [$math]);
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson(sgUrl($school, $group), [
            'section_ids' => [$b->id, $c->id],
            'subject_ids' => [$english->id],
        ])
        ->assertOk();

    expect($group->sections()->pluck('sections.id')->sort()->values()->all())->toBe([$b->id, $c->id]);
    expect($group->subjects()->pluck('subjects.id')->all())->toBe([$english->id]);
});

it('clears the lists when empty ones are sent', function () {
    $school = sgSchool();
    $a = sgSection($school, 'A');
    $math = sgSubject($school, 'Mathematics', 'MATH');
    $grade = sgGrade($school, 'Grade 1', [$a]);
    $group = sgGroup($school, $grade, 'Core', [$a], [$math]);
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson(sgUrl($school, $group), ['section_ids' => [], 'subject_ids' => []])
        ->assertOk()
        ->assertJsonCount(0, 'data.sections')
        ->assertJsonCount(0, 'data.subjects');

    expect($group->sections()->count())->toBe(0);
    expect($group->subjects()->count())->toBe(0);
});

it("refuses to change a group's grade", function () {
    $school = sgSchool();
    $one = sgGrade($school, 'Grade 1');
    $two = sgGrade($school, 'Grade 2');
    $group = sgGroup($school, $one, 'Core');
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson(sgUrl($school, $group), ['grade_id' => $two->id])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('grade_id');

    expect($group->fresh()->grade_id)->toBe($one->id);
});

it("rejects a section that the group's grade does not have, and changes nothing", function () {
    $school = sgSchool();
    $a = sgSection($school, 'A');
    $b = sgSection($school, 'B');
    $grade = sgGrade($school, 'Grade 1', [$a]);
    $group = sgGroup($school, $grade, 'Core', [$a]);
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson(sgUrl($school, $group), ['title' => 'Changed', 'section_ids' => [$b->id]])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('section_ids.0');

    expect($group->fresh()->title)->toBe('Core');
    expect($group->sections()->pluck('sections.id')->all())->toBe([$a->id]);
});

it("rejects renaming a group to another group's title in the same grade", function () {
    $school = sgSchool();
    $grade = sgGrade($school, 'Grade 1');
    sgGroup($school, $grade, 'Core');
    $electives = sgGroup($school, $grade, 'Electives');
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson(sgUrl($school, $electives), ['title' => 'Core'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('title');

    expect($electives->fresh()->title)->toBe('Electives');
});

it('lets an update keep the same title', function () {
    $school = sgSchool();
    $grade = sgGrade($school, 'Grade 1');
    $group = sgGroup($school, $grade, 'Core');
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->putJson(sgUrl($school, $group), ['title' => 'Core', 'description' => 'Same title, new text'])
        ->assertOk()
        ->assertJsonPath('data.description', 'Same title, new text');
});

it("returns 404 when updating another school's group", function () {
    $north = sgSchool('north');
    $south = sgSchool('south');
    $southGroup = sgGroup($south, sgGrade($south, 'Grade 1'), 'Core');
    $admin = sgMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$north->id}/subject-groups/{$southGroup->id}", ['title' => 'Hacked'])
        ->assertNotFound();

    expect($southGroup->fresh()->title)->toBe('Core');
});

it('blocks a teacher from updating a group', function () {
    $school = sgSchool();
    $group = sgGroup($school, sgGrade($school, 'Grade 1'), 'Core');
    $teacher = sgMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->patchJson(sgUrl($school, $group), ['title' => 'Hacked'])
        ->assertForbidden();

    expect($group->fresh()->title)->toBe('Core');
});

it('blocks guests from updating a group', function () {
    $school = sgSchool();
    $group = sgGroup($school, sgGrade($school, 'Grade 1'), 'Core');

    $this->patchJson(sgUrl($school, $group), ['title' => 'Hacked'])->assertUnauthorized();
});

// ---- Delete ----

it('deletes a group and its assignments but keeps the grade, sections and subjects', function () {
    $school = sgSchool();
    $a = sgSection($school, 'A');
    $math = sgSubject($school, 'Mathematics', 'MATH');
    $grade = sgGrade($school, 'Grade 1', [$a]);
    $group = sgGroup($school, $grade, 'Core', [$a], [$math]);
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson(sgUrl($school, $group))
        ->assertNoContent();

    $this->assertDatabaseMissing('subject_groups', ['id' => $group->id]);
    $this->assertDatabaseMissing('subject_group_section', ['subject_group_id' => $group->id]);
    $this->assertDatabaseMissing('subject_group_subject', ['subject_group_id' => $group->id]);
    $this->assertDatabaseHas('grades', ['id' => $grade->id]);
    $this->assertDatabaseHas('sections', ['id' => $a->id]);
    $this->assertDatabaseHas('subjects', ['id' => $math->id]);
});

it("returns 404 when deleting another school's group", function () {
    $north = sgSchool('north');
    $south = sgSchool('south');
    $southGroup = sgGroup($south, sgGrade($south, 'Grade 1'), 'Core');
    $admin = sgMember($north, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$north->id}/subject-groups/{$southGroup->id}")
        ->assertNotFound();

    $this->assertDatabaseHas('subject_groups', ['id' => $southGroup->id]);
});

it('blocks a teacher from deleting a group', function () {
    $school = sgSchool();
    $group = sgGroup($school, sgGrade($school, 'Grade 1'), 'Core');
    $teacher = sgMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->deleteJson(sgUrl($school, $group))
        ->assertForbidden();

    $this->assertDatabaseHas('subject_groups', ['id' => $group->id]);
});

it('blocks guests from deleting a group', function () {
    $school = sgSchool();
    $group = sgGroup($school, sgGrade($school, 'Grade 1'), 'Core');

    $this->deleteJson(sgUrl($school, $group))->assertUnauthorized();

    $this->assertDatabaseHas('subject_groups', ['id' => $group->id]);
});

// ---- Rules that connect groups to grades, sections and subjects ----

it('refuses to remove a section from a grade while one of its groups uses it', function () {
    $school = sgSchool();
    $a = sgSection($school, 'A');
    $b = sgSection($school, 'B');
    $grade = sgGrade($school, 'Grade 1', [$a, $b]);
    sgGroup($school, $grade, 'Science', [$a]);
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/grades/{$grade->id}", [
            'title' => 'Changed',
            'section_ids' => [$b->id],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('section_ids');

    // The whole save is undone, including the rename.
    expect($grade->fresh()->title)->toBe('Grade 1');
    expect($grade->sections()->pluck('sections.id')->sort()->values()->all())->toBe([$a->id, $b->id]);
});

it('allows removing a section from a grade when no group of that grade uses it', function () {
    $school = sgSchool();
    $a = sgSection($school, 'A');
    $b = sgSection($school, 'B');
    $grade = sgGrade($school, 'Grade 1', [$a, $b]);
    sgGroup($school, $grade, 'Science', [$a]);
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/grades/{$grade->id}", ['section_ids' => [$a->id]])
        ->assertOk();

    expect($grade->sections()->pluck('sections.id')->all())->toBe([$a->id]);
});

it("is not blocked by another grade's group using the same section", function () {
    $school = sgSchool();
    $a = sgSection($school, 'A');
    $one = sgGrade($school, 'Grade 1', [$a]);
    $two = sgGrade($school, 'Grade 2', [$a]);
    sgGroup($school, $two, 'Science', [$a]);
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/grades/{$one->id}", ['section_ids' => []])
        ->assertOk();

    expect($one->sections()->count())->toBe(0);
    expect($two->sections()->count())->toBe(1);
});

it('refuses to delete a subject that a group uses', function () {
    $school = sgSchool();
    $math = sgSubject($school, 'Mathematics', 'MATH');
    sgGroup($school, sgGrade($school, 'Grade 1'), 'Core', [], [$math]);
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/subjects/{$math->id}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('subject');

    $this->assertDatabaseHas('subjects', ['id' => $math->id]);
});

it('allows deleting a subject once no group uses it', function () {
    $school = sgSchool();
    $math = sgSubject($school, 'Mathematics', 'MATH');
    $group = sgGroup($school, sgGrade($school, 'Grade 1'), 'Core', [], [$math]);
    $group->subjects()->sync([]);
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/subjects/{$math->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('subjects', ['id' => $math->id]);
});

it('refuses to delete a grade that has groups', function () {
    $school = sgSchool();
    $grade = sgGrade($school, 'Grade 1');
    sgGroup($school, $grade, 'Core');
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/grades/{$grade->id}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('grade');

    $this->assertDatabaseHas('grades', ['id' => $grade->id]);
});

it('allows deleting a grade once its groups are gone', function () {
    $school = sgSchool();
    $grade = sgGrade($school, 'Grade 1');
    $group = sgGroup($school, $grade, 'Core');
    $admin = sgMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson(sgUrl($school, $group))
        ->assertNoContent();

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/grades/{$grade->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('grades', ['id' => $grade->id]);
});

<?php

use App\Models\School;
use App\Models\User;
use Illuminate\Support\Facades\Route;

function makeSchool(string $slug): School
{
    return School::create(['name' => ucfirst($slug), 'slug' => $slug]);
}

function makeMember(School $school, string $role): User
{
    $user = User::factory()->create();
    $school->users()->attach($user, ['role' => $role]);

    return $user;
}

function superAdmin(): User
{
    return User::factory()->create(['is_super_admin' => true]);
}

// There are no admin-only school routes yet, so this temporary one
// proves the "manage" rule. Slice 3 adds real ones.
beforeEach(function () {
    Route::middleware(['api', 'auth:sanctum', 'can:manage,school'])
        ->get('/api/test-admin-probe/{school}', fn(School $school) => response()->json(['ok' => true]));
});

it('blocks guests from the schools list', function () {
    $this->getJson('/api/schools')->assertUnauthorized();
});

it('blocks guests from a single school', function () {
    $school = makeSchool('a');

    $this->getJson("/api/schools/{$school->id}")->assertUnauthorized();
});

it('lists only the schools the user belongs to', function () {
    $a = makeSchool('a');
    makeSchool('b');
    $user = makeMember($a, 'teacher');

    $this->actingAs($user, 'sanctum')
        ->getJson('/api/schools')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.slug', 'a');
});

it('lists every school for a super admin', function () {
    makeSchool('a');
    makeSchool('b');

    $this->actingAs(superAdmin(), 'sanctum')
        ->getJson('/api/schools')
        ->assertOk()
        ->assertJsonCount(2, 'data');
});

it('lists nothing for a user with no schools', function () {
    makeSchool('a');

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson('/api/schools')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('lets a member view their school', function () {
    $school = makeSchool('a');
    $user = makeMember($school, 'teacher');

    $this->actingAs($user, 'sanctum')
        ->getJson("/api/schools/{$school->id}")
        ->assertOk()
        ->assertJsonPath('data.slug', 'a');
});

it('forbids a non-member from viewing a school', function () {
    $school = makeSchool('a');

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson("/api/schools/{$school->id}")
        ->assertForbidden();
});

it('forbids an admin of one school from viewing another', function () {
    $a = makeSchool('a');
    $b = makeSchool('b');
    $adminOfA = makeMember($a, 'admin');

    $this->actingAs($adminOfA, 'sanctum')
        ->getJson("/api/schools/{$b->id}")
        ->assertForbidden();
});

it('lets a super admin view any school', function () {
    $school = makeSchool('a');

    $this->actingAs(superAdmin(), 'sanctum')
        ->getJson("/api/schools/{$school->id}")
        ->assertOk();
});

it('treats a deleted school as gone', function () {
    $school = makeSchool('a');
    $user = makeMember($school, 'admin');
    $school->delete();

    $this->actingAs($user, 'sanctum')
        ->getJson("/api/schools/{$school->id}")
        ->assertNotFound();

    $this->actingAs($user, 'sanctum')
        ->getJson('/api/schools')
        ->assertJsonCount(0, 'data');
});

it('returns 404 for a school that does not exist', function () {
    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson('/api/schools/9999')
        ->assertNotFound();
});

it('lets a school admin through an admin-only route', function () {
    $school = makeSchool('a');

    $this->actingAs(makeMember($school, 'admin'), 'sanctum')
        ->getJson("/api/test-admin-probe/{$school->id}")
        ->assertOk();
});

it('blocks a teacher from an admin-only route but not from viewing', function () {
    $school = makeSchool('a');
    $teacher = makeMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/test-admin-probe/{$school->id}")
        ->assertForbidden();

    $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/schools/{$school->id}")
        ->assertOk();
});

it('keeps roles separate per school', function () {
    $a = makeSchool('a');
    $b = makeSchool('b');
    $user = makeMember($a, 'admin');
    $b->users()->attach($user, ['role' => 'teacher']);

    $this->actingAs($user, 'sanctum')
        ->getJson("/api/test-admin-probe/{$a->id}")
        ->assertOk();

    $this->actingAs($user, 'sanctum')
        ->getJson("/api/test-admin-probe/{$b->id}")
        ->assertForbidden();
});

it('blocks a non-member from an admin-only route', function () {
    $school = makeSchool('a');

    $this->actingAs(User::factory()->create(), 'sanctum')
        ->getJson("/api/test-admin-probe/{$school->id}")
        ->assertForbidden();
});

it('lets a super admin through an admin-only route', function () {
    $school = makeSchool('a');

    $this->actingAs(superAdmin(), 'sanctum')
        ->getJson("/api/test-admin-probe/{$school->id}")
        ->assertOk();
});

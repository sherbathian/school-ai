<?php

use App\Enums\SchoolStatus;
use App\Models\School;
use App\Models\User;

function crudSchool(string $slug = 'north'): School
{
    return School::create(['name' => ucfirst($slug), 'slug' => $slug]);
}

function crudMember(School $school, string $role): User
{
    $user = User::factory()->create();
    $school->users()->attach($user, ['role' => $role]);

    return $user;
}

function crudSuper(): User
{
    return User::factory()->create(['is_super_admin' => true]);
}

function validSchool(array $overrides = []): array
{
    return array_merge(['name' => 'Green Valley School'], $overrides);
}

// ---- Create ----

it('creates a school as a super admin', function () {
    $this->actingAs(crudSuper(), 'sanctum')
        ->postJson('/api/schools', validSchool())
        ->assertCreated()
        ->assertJsonPath('data.name', 'Green Valley School')
        ->assertJsonPath('data.slug', 'green-valley-school')
        ->assertJsonPath('data.status', 'active');

    $this->assertDatabaseHas('schools', ['slug' => 'green-valley-school']);
});

it('saves the optional details', function () {
    $details = [
        'url' => 'https://greenvalley.example',
        'phone' => '+92 51 1234567',
        'email' => 'office@greenvalley.example',
        'address' => '12 Main Road',
        'about' => 'A small neighbourhood school.',
    ];

    $this->actingAs(crudSuper(), 'sanctum')
        ->postJson('/api/schools', validSchool($details))
        ->assertCreated()
        ->assertJsonPath('data.url', 'https://greenvalley.example')
        ->assertJsonPath('data.phone', '+92 51 1234567');

    $this->assertDatabaseHas('schools', $details);
});

it('gives schools with the same name different slugs', function () {
    $super = crudSuper();

    $first = $this->actingAs($super, 'sanctum')->postJson('/api/schools', validSchool());
    $second = $this->actingAs($super, 'sanctum')->postJson('/api/schools', validSchool());

    expect($first->json('data.slug'))->toBe('green-valley-school');
    expect($second->json('data.slug'))->toBe('green-valley-school-2');
});

it('does not reuse the slug of a deleted school', function () {
    crudSchool('green-valley-school')->delete();

    $this->actingAs(crudSuper(), 'sanctum')
        ->postJson('/api/schools', validSchool())
        ->assertCreated()
        ->assertJsonPath('data.slug', 'green-valley-school-2');
});

it('falls back to a default slug when the name has no letters or digits', function () {
    $this->actingAs(crudSuper(), 'sanctum')
        ->postJson('/api/schools', validSchool(['name' => '***']))
        ->assertCreated()
        ->assertJsonPath('data.slug', 'school');
});

it('ignores a slug sent by the client', function () {
    $this->actingAs(crudSuper(), 'sanctum')
        ->postJson('/api/schools', validSchool(['slug' => 'custom']))
        ->assertCreated()
        ->assertJsonPath('data.slug', 'green-valley-school');
});

it('rejects a missing name', function () {
    $this->actingAs(crudSuper(), 'sanctum')
        ->postJson('/api/schools', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');
});

it('rejects invalid values', function (string $field, string $value) {
    $this->actingAs(crudSuper(), 'sanctum')
        ->postJson('/api/schools', validSchool([$field => $value]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);
})->with([
    'bad email' => ['email', 'not-an-email'],
    'bad url' => ['url', 'not a url'],
    'javascript url' => ['url', 'javascript:alert(1)'],
    'unknown status' => ['status', 'archived'],
    'overlong name' => ['name', str_repeat('a', 256)],
    'overlong phone' => ['phone', str_repeat('1', 31)],
]);

it('blocks a school admin from creating schools', function () {
    $admin = crudMember(crudSchool('north'), 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson('/api/schools', validSchool())
        ->assertForbidden();

    $this->assertDatabaseMissing('schools', ['name' => 'Green Valley School']);
});

it('blocks a teacher from creating schools', function () {
    $teacher = crudMember(crudSchool('north'), 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->postJson('/api/schools', validSchool())
        ->assertForbidden();
});

it('blocks a user with no school from creating schools', function () {
    $this->actingAs(User::factory()->create(), 'sanctum')
        ->postJson('/api/schools', validSchool())
        ->assertForbidden();
});

it('blocks guests from creating schools', function () {
    $this->postJson('/api/schools', validSchool())->assertUnauthorized();
});

// ---- Update ----

it('lets a school admin update their own school', function () {
    $school = crudSchool('north');
    $admin = crudMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}", ['name' => 'North Campus', 'phone' => '0300 0000000'])
        ->assertOk()
        ->assertJsonPath('data.name', 'North Campus');

    $this->assertDatabaseHas('schools', [
        'id' => $school->id,
        'name' => 'North Campus',
        'phone' => '0300 0000000',
    ]);
});

it('lets a super admin update any school', function () {
    $school = crudSchool('north');

    $this->actingAs(crudSuper(), 'sanctum')
        ->patchJson("/api/schools/{$school->id}", ['name' => 'Renamed'])
        ->assertOk();

    expect($school->fresh()->name)->toBe('Renamed');
});

it('keeps the slug when a school is renamed', function () {
    $school = crudSchool('north');
    $admin = crudMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}", ['name' => 'Completely Different'])
        ->assertOk()
        ->assertJsonPath('data.slug', 'north');

    expect($school->fresh()->slug)->toBe('north');
});

it('supports partial updates and clearing optional fields', function () {
    $school = School::create(['name' => 'North', 'slug' => 'north', 'phone' => '123', 'about' => 'Hello']);
    $admin = crudMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}", ['phone' => null])
        ->assertOk();

    $fresh = $school->fresh();
    expect($fresh->phone)->toBeNull();
    expect($fresh->name)->toBe('North');
    expect($fresh->about)->toBe('Hello');
});

it('rejects a blank name on update', function () {
    $school = crudSchool('north');
    $admin = crudMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}", ['name' => ''])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('name');

    expect($school->fresh()->name)->toBe('North');
});

it('blocks a teacher from updating the school', function () {
    $school = crudSchool('north');
    $teacher = crudMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->patchJson("/api/schools/{$school->id}", ['name' => 'Hacked'])
        ->assertForbidden();

    expect($school->fresh()->name)->toBe('North');
});

it('blocks the admin of another school from updating', function () {
    $north = crudSchool('north');
    $south = crudSchool('south');
    $adminOfNorth = crudMember($north, 'admin');

    $this->actingAs($adminOfNorth, 'sanctum')
        ->patchJson("/api/schools/{$south->id}", ['name' => 'Hacked'])
        ->assertForbidden();

    expect($south->fresh()->name)->toBe('South');
});

it('blocks guests from updating', function () {
    $school = crudSchool('north');

    $this->patchJson("/api/schools/{$school->id}", ['name' => 'Hacked'])->assertUnauthorized();
});

it('stops a school admin from changing the status', function () {
    $school = crudSchool('north');
    $admin = crudMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}", ['status' => 'inactive'])
        ->assertForbidden();

    expect($school->fresh()->status)->toBe(SchoolStatus::Active);
});

it('lets a super admin change the status', function () {
    $school = crudSchool('north');

    $this->actingAs(crudSuper(), 'sanctum')
        ->patchJson("/api/schools/{$school->id}", ['status' => 'inactive'])
        ->assertOk()
        ->assertJsonPath('data.status', 'inactive');

    expect($school->fresh()->status)->toBe(SchoolStatus::Inactive);
});

it('returns 404 when updating a deleted school', function () {
    $school = crudSchool('north');
    $school->delete();

    $this->actingAs(crudSuper(), 'sanctum')
        ->patchJson("/api/schools/{$school->id}", ['name' => 'Ghost'])
        ->assertNotFound();
});

// ---- Delete ----

it('lets a super admin soft-delete a school', function () {
    $school = crudSchool('north');
    $member = crudMember($school, 'admin');

    $this->actingAs(crudSuper(), 'sanctum')
        ->deleteJson("/api/schools/{$school->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('schools', ['id' => $school->id]);

    $this->actingAs($member, 'sanctum')
        ->getJson('/api/me')
        ->assertJsonCount(0, 'schools');
});

it('stops a school admin from deleting their school', function () {
    $school = crudSchool('north');
    $admin = crudMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}")
        ->assertForbidden();

    $this->assertNotSoftDeleted('schools', ['id' => $school->id]);
});

it('stops a teacher from deleting the school', function () {
    $school = crudSchool('north');
    $teacher = crudMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}")
        ->assertForbidden();

    $this->assertNotSoftDeleted('schools', ['id' => $school->id]);
});

it('blocks guests from deleting', function () {
    $school = crudSchool('north');

    $this->deleteJson("/api/schools/{$school->id}")->assertUnauthorized();

    $this->assertNotSoftDeleted('schools', ['id' => $school->id]);
});

// ---- Show ----

it('shows the school details to a member', function () {
    $school = School::create([
        'name' => 'North',
        'slug' => 'north',
        'url' => 'https://north.example',
        'phone' => '123',
        'email' => 'office@north.example',
        'address' => '1 Road',
        'about' => 'Hello',
    ]);
    $teacher = crudMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/schools/{$school->id}")
        ->assertOk()
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.url', 'https://north.example')
        ->assertJsonPath('data.phone', '123')
        ->assertJsonPath('data.email', 'office@north.example')
        ->assertJsonPath('data.address', '1 Road')
        ->assertJsonPath('data.about', 'Hello');
});

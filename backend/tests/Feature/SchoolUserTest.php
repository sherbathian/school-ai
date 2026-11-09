<?php

use App\Models\School;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

function usersSchool(string $slug = 'north'): School
{
    return School::create(['name' => ucfirst($slug), 'slug' => $slug]);
}

function usersMember(School $school, string $role): User
{
    $user = User::factory()->create();
    $school->users()->attach($user, ['role' => $role]);

    return $user;
}

function usersSuper(): User
{
    return User::factory()->create(['is_super_admin' => true]);
}

function newPerson(array $overrides = []): array
{
    return array_merge([
        'name' => 'Sara Ahmed',
        'email' => 'sara@school.test',
        'password' => 'a-long-password',
        'role' => 'teacher',
    ], $overrides);
}

// ---- List members ----

it('lets a school admin list the members', function () {
    $school = usersSchool();
    $admin = usersMember($school, 'admin');
    $teacher = usersMember($school, 'teacher');

    $response = $this->actingAs($admin, 'sanctum')
        ->getJson("/api/schools/{$school->id}/users")
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonMissingPath('data.0.password')
        ->assertJsonMissingPath('data.0.remember_token');

    expect(collect($response->json('data'))->pluck('role', 'id')->all())
        ->toEqual([$admin->id => 'admin', $teacher->id => 'teacher']);
});

it('does not list people from other schools', function () {
    $north = usersSchool('north');
    $south = usersSchool('south');
    $admin = usersMember($north, 'admin');
    usersMember($south, 'teacher');

    $this->actingAs($admin, 'sanctum')
        ->getJson("/api/schools/{$north->id}/users")
        ->assertJsonCount(1, 'data');
});

it('blocks a teacher from listing members', function () {
    $school = usersSchool();
    $teacher = usersMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->getJson("/api/schools/{$school->id}/users")
        ->assertForbidden();
});

it('blocks the admin of another school from listing members', function () {
    $north = usersSchool('north');
    $south = usersSchool('south');
    $adminOfSouth = usersMember($south, 'admin');

    $this->actingAs($adminOfSouth, 'sanctum')
        ->getJson("/api/schools/{$north->id}/users")
        ->assertForbidden();
});

it('blocks guests from listing members', function () {
    $school = usersSchool();

    $this->getJson("/api/schools/{$school->id}/users")->assertUnauthorized();
});

it("lets a super admin list any school's members", function () {
    $school = usersSchool();
    usersMember($school, 'teacher');

    $this->actingAs(usersSuper(), 'sanctum')
        ->getJson("/api/schools/{$school->id}/users")
        ->assertOk()
        ->assertJsonCount(1, 'data');
});

// ---- Create an account and add it ----

it('creates an account and adds it to the school', function () {
    $school = usersSchool();
    $admin = usersMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/users", newPerson())
        ->assertCreated()
        ->assertJsonPath('data.email', 'sara@school.test')
        ->assertJsonPath('data.role', 'teacher');

    $user = User::where('email', 'sara@school.test')->first();

    expect($user)->not->toBeNull();
    expect($user->is_super_admin)->toBeFalse();
    expect($user->password)->not->toBe('a-long-password');
    expect(Hash::check('a-long-password', $user->password))->toBeTrue();

    $this->assertDatabaseHas('school_user', [
        'school_id' => $school->id,
        'user_id' => $user->id,
        'role' => 'teacher',
    ]);
});

it('lowercases the email address', function () {
    $school = usersSchool();
    $admin = usersMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/users", newPerson(['email' => 'Sara@School.TEST']))
        ->assertCreated()
        ->assertJsonPath('data.email', 'sara@school.test');
});

it('rejects invalid input', function (string $field, string $value) {
    $school = usersSchool();
    $admin = usersMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/users", newPerson([$field => $value]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors($field);

    expect(User::where('email', 'sara@school.test')->exists())->toBeFalse();
})->with([
    'blank name' => ['name', ''],
    'bad email' => ['email', 'nope'],
    'short password' => ['password', 'short'],
    'unknown role' => ['role', 'principal'],
    'blank role' => ['role', ''],
]);

it('rejects an email that already has an account', function () {
    $school = usersSchool();
    $admin = usersMember($school, 'admin');
    User::factory()->create(['email' => 'sara@school.test']);

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/users", newPerson())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('ignores an attempt to make the new account a super admin', function () {
    $school = usersSchool();
    $admin = usersMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$school->id}/users", newPerson(['is_super_admin' => true]))
        ->assertCreated();

    expect(User::where('email', 'sara@school.test')->first()->is_super_admin)->toBeFalse();
});

it('blocks a teacher from adding people', function () {
    $school = usersSchool();
    $teacher = usersMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->postJson("/api/schools/{$school->id}/users", newPerson())
        ->assertForbidden();

    $this->assertDatabaseMissing('users', ['email' => 'sara@school.test']);
});

it('blocks the admin of another school from adding people', function () {
    $north = usersSchool('north');
    $south = usersSchool('south');
    $adminOfSouth = usersMember($south, 'admin');

    $this->actingAs($adminOfSouth, 'sanctum')
        ->postJson("/api/schools/{$north->id}/users", newPerson())
        ->assertForbidden();

    $this->assertDatabaseMissing('users', ['email' => 'sara@school.test']);
});

it('blocks guests from adding people', function () {
    $school = usersSchool();

    $this->postJson("/api/schools/{$school->id}/users", newPerson())->assertUnauthorized();
});

it('lets a super admin add people to any school', function () {
    $school = usersSchool();

    $this->actingAs(usersSuper(), 'sanctum')
        ->postJson("/api/schools/{$school->id}/users", newPerson(['role' => 'admin']))
        ->assertCreated()
        ->assertJsonPath('data.role', 'admin');
});

// ---- Attach an existing account (super admin only) ----

it('lets a super admin add an existing account to a school', function () {
    $school = usersSchool();
    $existing = User::factory()->create();

    $this->actingAs(usersSuper(), 'sanctum')
        ->postJson("/api/schools/{$school->id}/users/attach", ['email' => $existing->email, 'role' => 'teacher'])
        ->assertCreated()
        ->assertJsonPath('data.id', $existing->id)
        ->assertJsonPath('data.role', 'teacher');

    $this->assertDatabaseHas('school_user', [
        'school_id' => $school->id,
        'user_id' => $existing->id,
    ]);
});

it('rejects someone who is already a member', function () {
    $school = usersSchool();
    $member = usersMember($school, 'teacher');

    $this->actingAs(usersSuper(), 'sanctum')
        ->postJson("/api/schools/{$school->id}/users/attach", ['email' => $member->email, 'role' => 'admin'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('rejects an unknown email', function () {
    $school = usersSchool();

    $this->actingAs(usersSuper(), 'sanctum')
        ->postJson("/api/schools/{$school->id}/users/attach", ['email' => 'nobody@school.test', 'role' => 'teacher'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('stops a school admin from adding existing accounts', function () {
    $north = usersSchool('north');
    $south = usersSchool('south');
    $admin = usersMember($north, 'admin');
    $outsider = usersMember($south, 'teacher');

    $this->actingAs($admin, 'sanctum')
        ->postJson("/api/schools/{$north->id}/users/attach", ['email' => $outsider->email, 'role' => 'teacher'])
        ->assertForbidden();

    $this->assertDatabaseMissing('school_user', [
        'school_id' => $north->id,
        'user_id' => $outsider->id,
    ]);
});

// ---- Change a role ----

it("lets an admin change a member's role", function () {
    $school = usersSchool();
    $admin = usersMember($school, 'admin');
    $teacher = usersMember($school, 'teacher');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/users/{$teacher->id}", ['role' => 'admin'])
        ->assertOk()
        ->assertJsonPath('data.role', 'admin');

    $this->assertDatabaseHas('school_user', [
        'school_id' => $school->id,
        'user_id' => $teacher->id,
        'role' => 'admin',
    ]);
});

it('refuses to demote the last admin', function () {
    $school = usersSchool();
    $admin = usersMember($school, 'admin');
    usersMember($school, 'teacher');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/users/{$admin->id}", ['role' => 'teacher'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('role');

    $this->assertDatabaseHas('school_user', [
        'school_id' => $school->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);
});

it('allows demoting an admin when another admin remains', function () {
    $school = usersSchool();
    $first = usersMember($school, 'admin');
    $second = usersMember($school, 'admin');

    $this->actingAs($first, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/users/{$second->id}", ['role' => 'teacher'])
        ->assertOk()
        ->assertJsonPath('data.role', 'teacher');
});

it('rejects an unknown role', function () {
    $school = usersSchool();
    $admin = usersMember($school, 'admin');
    $teacher = usersMember($school, 'teacher');

    $this->actingAs($admin, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/users/{$teacher->id}", ['role' => 'principal'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('role');
});

it('returns 404 for someone who is not a member of this school', function () {
    $north = usersSchool('north');
    $south = usersSchool('south');
    $adminOfNorth = usersMember($north, 'admin');
    $southTeacher = usersMember($south, 'teacher');

    $this->actingAs($adminOfNorth, 'sanctum')
        ->patchJson("/api/schools/{$north->id}/users/{$southTeacher->id}", ['role' => 'admin'])
        ->assertNotFound();

    $this->assertDatabaseHas('school_user', [
        'school_id' => $south->id,
        'user_id' => $southTeacher->id,
        'role' => 'teacher',
    ]);
});

it('stops a teacher from promoting themselves', function () {
    $school = usersSchool();
    $teacher = usersMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->patchJson("/api/schools/{$school->id}/users/{$teacher->id}", ['role' => 'admin'])
        ->assertForbidden();

    $this->assertDatabaseHas('school_user', [
        'school_id' => $school->id,
        'user_id' => $teacher->id,
        'role' => 'teacher',
    ]);
});

it('blocks the admin of another school from changing roles', function () {
    $north = usersSchool('north');
    $south = usersSchool('south');
    $adminOfSouth = usersMember($south, 'admin');
    $northTeacher = usersMember($north, 'teacher');

    $this->actingAs($adminOfSouth, 'sanctum')
        ->patchJson("/api/schools/{$north->id}/users/{$northTeacher->id}", ['role' => 'admin'])
        ->assertForbidden();
});

it('lets a super admin change roles in any school', function () {
    $school = usersSchool();
    $teacher = usersMember($school, 'teacher');

    $this->actingAs(usersSuper(), 'sanctum')
        ->patchJson("/api/schools/{$school->id}/users/{$teacher->id}", ['role' => 'admin'])
        ->assertOk();
});

// ---- Remove a member ----

it('lets an admin remove a member but keeps the account', function () {
    $school = usersSchool();
    $admin = usersMember($school, 'admin');
    $teacher = usersMember($school, 'teacher');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/users/{$teacher->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('school_user', [
        'school_id' => $school->id,
        'user_id' => $teacher->id,
    ]);
    expect(User::find($teacher->id))->not->toBeNull();
});

it('refuses to remove the last admin', function () {
    $school = usersSchool();
    $admin = usersMember($school, 'admin');

    $this->actingAs($admin, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/users/{$admin->id}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('user');

    $this->assertDatabaseHas('school_user', [
        'school_id' => $school->id,
        'user_id' => $admin->id,
    ]);
});

it('lets an admin leave when another admin remains', function () {
    $school = usersSchool();
    $first = usersMember($school, 'admin');
    usersMember($school, 'admin');

    $this->actingAs($first, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/users/{$first->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('school_user', [
        'school_id' => $school->id,
        'user_id' => $first->id,
    ]);
});

it('returns 404 when removing someone who is not a member', function () {
    $north = usersSchool('north');
    $south = usersSchool('south');
    $adminOfNorth = usersMember($north, 'admin');
    $southTeacher = usersMember($south, 'teacher');

    $this->actingAs($adminOfNorth, 'sanctum')
        ->deleteJson("/api/schools/{$north->id}/users/{$southTeacher->id}")
        ->assertNotFound();

    $this->assertDatabaseHas('school_user', [
        'school_id' => $south->id,
        'user_id' => $southTeacher->id,
    ]);
});

it('stops a teacher from removing members', function () {
    $school = usersSchool();
    $teacher = usersMember($school, 'teacher');
    $other = usersMember($school, 'teacher');

    $this->actingAs($teacher, 'sanctum')
        ->deleteJson("/api/schools/{$school->id}/users/{$other->id}")
        ->assertForbidden();

    $this->assertDatabaseHas('school_user', [
        'school_id' => $school->id,
        'user_id' => $other->id,
    ]);
});

it('blocks the admin of another school from removing members', function () {
    $north = usersSchool('north');
    $south = usersSchool('south');
    $adminOfSouth = usersMember($south, 'admin');
    $northTeacher = usersMember($north, 'teacher');

    $this->actingAs($adminOfSouth, 'sanctum')
        ->deleteJson("/api/schools/{$north->id}/users/{$northTeacher->id}")
        ->assertForbidden();

    $this->assertDatabaseHas('school_user', [
        'school_id' => $north->id,
        'user_id' => $northTeacher->id,
    ]);
});

it('blocks guests from removing members', function () {
    $school = usersSchool();
    $teacher = usersMember($school, 'teacher');

    $this->deleteJson("/api/schools/{$school->id}/users/{$teacher->id}")->assertUnauthorized();
});

// ---- Change my password ----

it('changes the password when the current one is right', function () {
    $user = User::factory()->create(['email' => 'a@school.test']);

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/me/password', [
            'current_password' => 'password',
            'password' => 'a-brand-new-passphrase',
            'password_confirmation' => 'a-brand-new-passphrase',
        ])
        ->assertNoContent();

    expect(Hash::check('a-brand-new-passphrase', $user->fresh()->password))->toBeTrue();

    $this->postJson('/api/login', ['email' => 'a@school.test', 'password' => 'a-brand-new-passphrase'])
        ->assertOk();
});

it('rejects a wrong current password', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/me/password', [
            'current_password' => 'not-my-password',
            'password' => 'a-brand-new-passphrase',
            'password_confirmation' => 'a-brand-new-passphrase',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('current_password');

    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
});

it('rejects a confirmation that does not match', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/me/password', [
            'current_password' => 'password',
            'password' => 'a-brand-new-passphrase',
            'password_confirmation' => 'something-else-entirely',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

it('rejects a new password that is too short', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/me/password', [
            'current_password' => 'password',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

it('rejects reusing the current password', function () {
    $user = User::factory()->create(['password' => 'current-long-passphrase']);

    $this->actingAs($user, 'sanctum')
        ->postJson('/api/me/password', [
            'current_password' => 'current-long-passphrase',
            'password' => 'current-long-passphrase',
            'password_confirmation' => 'current-long-passphrase',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('password');
});

it('signs out other sessions but keeps the current one', function () {
    User::factory()->create(['email' => 'a@school.test']);

    $login = fn() => $this->postJson('/api/login', [
        'email' => 'a@school.test',
        'password' => 'password',
    ])->json('token');

    $first = $login();
    $second = $login();

    $this->withToken($first)
        ->postJson('/api/me/password', [
            'current_password' => 'password',
            'password' => 'a-brand-new-passphrase',
            'password_confirmation' => 'a-brand-new-passphrase',
        ])
        ->assertNoContent();

    $this->assertDatabaseHas('personal_access_tokens', ['id' => (int) explode('|', $first)[0]]);
    $this->assertDatabaseMissing('personal_access_tokens', ['id' => (int) explode('|', $second)[0]]);
});

it('blocks guests from changing a password', function () {
    $this->postJson('/api/me/password', [
        'current_password' => 'password',
        'password' => 'a-brand-new-passphrase',
        'password_confirmation' => 'a-brand-new-passphrase',
    ])->assertUnauthorized();
});

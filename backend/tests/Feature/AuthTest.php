<?php

use App\Models\User;
use App\Models\School;

// A "factory" builds a fake user. Its default password is "password".

it('logs in with valid credentials and returns a token', function () {
    User::factory()->create(['email' => 'a@school.test']);

    $this->postJson('/api/login', [
        'email' => 'a@school.test',
        'password' => 'password',
    ])
        ->assertOk()
        ->assertJsonStructure(['token', 'user' => ['id', 'email']]);
});

it('rejects a wrong password', function () {
    User::factory()->create(['email' => 'a@school.test']);

    $this->postJson('/api/login', [
        'email' => 'a@school.test',
        'password' => 'wrong',
    ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('email');
});

it('requires an email and a password', function () {
    $this->postJson('/api/login', [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'password']);
});

it('blocks /me without a token', function () {
    $this->getJson('/api/me')->assertUnauthorized();
});

it('returns the logged-in user from /me', function () {
    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->getJson('/api/me')
        ->assertOk()
        ->assertJsonPath('email', $user->email);
});

it('deletes the token on logout', function () {
    User::factory()->create(['email' => 'a@school.test']);

    $token = $this->postJson('/api/login', [
        'email' => 'a@school.test',
        'password' => 'password',
    ])->json('token');

    $this->withToken($token)->postJson('/api/logout')->assertNoContent();

    $this->assertDatabaseCount('personal_access_tokens', 0);
});

it('throttles repeated login attempts', function () {
    User::factory()->create(['email' => 'a@school.test']);

    foreach (range(1, 5) as $attempt) {
        $this->postJson('/api/login', ['email' => 'a@school.test', 'password' => 'wrong'])
            ->assertUnprocessable();
    }

    $this->postJson('/api/login', ['email' => 'a@school.test', 'password' => 'wrong'])
        ->assertStatus(429);
});

it('rejects an expired token', function () {
    User::factory()->create(['email' => 'a@school.test']);

    $token = $this->postJson('/api/login', [
        'email' => 'a@school.test',
        'password' => 'password',
    ])->json('token');

    $this->travel(9)->hours();

    $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
});

it('returns the user with their schools and roles from /me', function () {
    $school = School::create(['name' => 'Demo', 'slug' => 'demo']);
    $user = User::factory()->create();
    $school->users()->attach($user, ['role' => 'teacher']);

    $this->actingAs($user, 'sanctum')
        ->getJson('/api/me')
        ->assertOk()
        ->assertJsonPath('is_super_admin', false)
        ->assertJsonPath('schools.0.slug', 'demo')
        ->assertJsonPath('schools.0.role', 'teacher')
        ->assertJsonMissingPath('password')
        ->assertJsonMissingPath('remember_token');
});
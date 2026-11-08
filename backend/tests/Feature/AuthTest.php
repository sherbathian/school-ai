<?php

use App\Models\User;

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
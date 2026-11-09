<?php

use App\Enums\SchoolRole;
use App\Models\School;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

function demoSchool(string $slug = 'demo'): School
{
    return School::create(['name' => ucfirst($slug), 'slug' => $slug]);
}

it('stores a role per membership', function () {
    $school = demoSchool();
    $user = User::factory()->create();
    $school->users()->attach($user, ['role' => 'admin']);

    $this->assertDatabaseHas('school_user', [
        'school_id' => $school->id,
        'user_id' => $user->id,
        'role' => 'admin',
    ]);
    expect($user->schools->first()->pivot->role)->toBe(SchoolRole::Admin);
});

it('allows different roles at different schools', function () {
    $user = User::factory()->create();
    demoSchool('a')->users()->attach($user, ['role' => 'admin']);
    demoSchool('b')->users()->attach($user, ['role' => 'teacher']);

    expect($user->schools()->count())->toBe(2);
});

it('allows only one membership per user per school', function () {
    $school = demoSchool();
    $user = User::factory()->create();
    $school->users()->attach($user, ['role' => 'admin']);

    expect(fn() => $school->users()->attach($user, ['role' => 'teacher']))
        ->toThrow(QueryException::class);
});

it('rejects an unknown role in the application', function () {
    $school = demoSchool();
    $user = User::factory()->create();

    expect(fn() => $school->users()->attach($user, ['role' => 'principal']))
        ->toThrow(ValueError::class);
});

it('rejects an unknown role in the database itself', function () {
    $school = demoSchool();
    $user = User::factory()->create();

    expect(fn() => DB::table('school_user')->insert([
        'school_id' => $school->id,
        'user_id' => $user->id,
        'role' => 'principal',
    ]))->toThrow(QueryException::class);
});

it('cannot be made super admin through mass assignment', function () {
    $user = User::create([
        'name' => 'X',
        'email' => 'x@school.test',
        'password' => 'password',
        'is_super_admin' => true,
    ]);

    expect($user->fresh()->is_super_admin)->toBeFalse();
});

it('seeds the demo data locally', function () {
    $this->seed(DatabaseSeeder::class);

    expect(User::where('is_super_admin', true)->count())->toBe(1);

    $teacher = User::where('email', 'teacher@school.test')->first();
    expect($teacher->schools->first()->pivot->role)->toBe(SchoolRole::Teacher);
});

it('refuses to seed outside local development', function () {
    app()->detectEnvironment(fn() => 'production');

    expect(fn() => (new DatabaseSeeder)->run())->toThrow(RuntimeException::class);
});

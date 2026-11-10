<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Enums\SchoolRole;
use App\Models\School;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (! app()->environment('local', 'testing')) {
            throw new \RuntimeException('Demo data may only be seeded locally.');
        }

        User::factory()->create([
            'name' => 'Super Admin',
            'email' => 'super@school.test',
            'is_super_admin' => true,
        ]);

        $school = School::create(['name' => 'Demo School', 'slug' => 'demo-school']);

        $admin = User::factory()->create(['name' => 'Demo Admin', 'email' => 'admin@school.test']);
        $teacher = User::factory()->create(['name' => 'Demo Teacher', 'email' => 'teacher@school.test']);
        
        $school->users()->attach($admin, ['role' => SchoolRole::Admin->value]);
        $school->users()->attach($teacher, ['role' => SchoolRole::Teacher->value]);

        $sections = collect(['A', 'B', 'C'])
            ->map(fn($title) => $school->sections()->create(['title' => $title]));

        foreach (['Grade 1', 'Grade 2', 'Grade 3'] as $title) {
            $grade = $school->grades()->create(['title' => $title]);
            $grade->sections()->attach($sections->take(2)->pluck('id')->all());
        }

        $subjects = [
            ['Mathematics', 'MATH', 'theory'],
            ['English', 'ENG', 'theory'],
            ['Physics Lab', 'PHY-LAB', 'practical'],
        ];

        foreach ($subjects as [$title, $code, $type]) {
            $school->subjects()->create(['title' => $title, 'code' => $code, 'type' => $type]);
        }
    }
}

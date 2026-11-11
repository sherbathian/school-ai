<?php

namespace Database\Seeders;

use App\Enums\SchoolRole;
use App\Models\School;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use RuntimeException;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        if (! app()->environment('local', 'testing')) {
            throw new RuntimeException('Demo data may only be seeded locally.');
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

        $grades = collect(['Grade 1', 'Grade 2', 'Grade 3'])->map(function ($title) use ($school, $sections) {
            $grade = $school->grades()->create(['title' => $title]);
            $grade->sections()->attach($sections->take(2)->pluck('id')->all());

            return $grade;
        });

        $subjects = collect([
            ['Mathematics', 'MATH', 'theory'],
            ['English', 'ENG', 'theory'],
            ['Physics Lab', 'PHY-LAB', 'practical'],
        ])->map(fn($row) => $school->subjects()->create([
            'title' => $row[0],
            'code' => $row[1],
            'type' => $row[2],
        ]));

        $group = $school->subjectGroups()->create([
            'grade_id' => $grades->first()->id,
            'title' => 'Core subjects',
            'description' => 'Compulsory for every student.',
        ]);
        $group->sections()->attach($sections->take(2)->pluck('id')->all());
        $group->subjects()->attach($subjects->pluck('id')->all());
    }
}

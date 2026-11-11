<?php

namespace App\Http\Controllers;

use App\Enums\RecordStatus;
use App\Http\Requests\GradeRequest;
use App\Http\Resources\GradeResource;
use App\Models\Grade;
use App\Models\School;
use App\Models\Section;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class GradeController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('can:view,school', only: ['index', 'show']),
            new Middleware('can:manage,school', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(School $school)
    {
        $grades = $school->grades()
            ->with(['sections' => fn($query) => $query->orderBy('title')])
            ->orderBy('title')
            ->get();

        return GradeResource::collection($grades);
    }

    public function store(GradeRequest $request, School $school)
    {
        $data = $request->validated();

        $grade = DB::transaction(function () use ($school, $data) {
            $grade = $school->grades()->create([
                ...Arr::except($data, ['section_ids']),
                'status' => $data['status'] ?? RecordStatus::Active->value,
            ]);

            $grade->sections()->sync($data['section_ids'] ?? []);

            return $grade;
        });

        // A freshly created model is returned with a 201 status automatically.
        return new GradeResource($this->withSections($grade));
    }

    public function show(School $school, Grade $grade)
    {
        return new GradeResource($this->withSections($grade));
    }

    public function update(GradeRequest $request, School $school, Grade $grade)
    {
        $data = $request->validated();

        DB::transaction(function () use ($grade, $data) {
            $grade->update(Arr::except($data, ['section_ids']));

            if (array_key_exists('section_ids', $data)) {
                // If this throws, the transaction also undoes the update above.
                $this->ensureNoGroupUsesRemovedSections($grade, $data['section_ids']);
                $grade->sections()->sync($data['section_ids']);
            }
        });

        return new GradeResource($this->withSections($grade));
    }

    public function destroy(School $school, Grade $grade)
    {
        if ($grade->subjectGroups()->exists()) {
            throw ValidationException::withMessages([
                'grade' => ['This grade has subject groups. Delete them first, or mark the grade inactive instead.'],
            ]);
        }

        DB::transaction(function () use ($grade) {
            $grade->sections()->detach();
            $grade->delete();
        });

        return response()->noContent();
    }

    /** A subject group of this grade may only use sections the grade still has. */
    private function ensureNoGroupUsesRemovedSections(Grade $grade, array $keptIds): void
    {
        $removedIds = $grade->sections()
            ->pluck('sections.id')
            ->diff($keptIds)
            ->values()
            ->all();

        $blocked = Section::query()
            ->whereIn('id', $removedIds)
            ->whereHas('subjectGroups', fn($query) => $query->where('subject_groups.grade_id', $grade->id))
            ->orderBy('title')
            ->pluck('title');

        if ($blocked->isNotEmpty()) {
            throw ValidationException::withMessages([
                'section_ids' => [
                    'These sections are still used by a subject group of this grade: '
                        . $blocked->join(', ') . '. Remove them from the group first.',
                ],
            ]);
        }
    }

    private function withSections(Grade $grade): Grade
    {
        return $grade->load(['sections' => fn($query) => $query->orderBy('title')]);
    }
}

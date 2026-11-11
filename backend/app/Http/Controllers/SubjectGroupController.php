<?php

namespace App\Http\Controllers;

use App\Http\Requests\SubjectGroupRequest;
use App\Http\Resources\SubjectGroupResource;
use App\Models\School;
use App\Models\SubjectGroup;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class SubjectGroupController extends Controller implements HasMiddleware
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
        $groups = $school->subjectGroups()
            ->with($this->eagerLoads())
            ->orderBy('title')
            ->get();

        return SubjectGroupResource::collection($groups);
    }

    public function store(SubjectGroupRequest $request, School $school)
    {
        $data = $request->validated();

        $group = DB::transaction(function () use ($school, $data) {
            $group = $school->subjectGroups()->create(
                Arr::only($data, ['grade_id', 'title', 'description'])
            );

            $group->sections()->sync($data['section_ids'] ?? []);
            $group->subjects()->sync($data['subject_ids'] ?? []);

            return $group;
        });

        // A freshly created model is returned with a 201 status automatically.
        return new SubjectGroupResource($group->load($this->eagerLoads()));
    }

    public function show(School $school, SubjectGroup $subjectGroup)
    {
        return new SubjectGroupResource($subjectGroup->load($this->eagerLoads()));
    }

    public function update(SubjectGroupRequest $request, School $school, SubjectGroup $subjectGroup)
    {
        $data = $request->validated();

        DB::transaction(function () use ($subjectGroup, $data) {
            $subjectGroup->update(Arr::only($data, ['title', 'description']));

            if (array_key_exists('section_ids', $data)) {
                $subjectGroup->sections()->sync($data['section_ids']);
            }

            if (array_key_exists('subject_ids', $data)) {
                $subjectGroup->subjects()->sync($data['subject_ids']);
            }
        });

        return new SubjectGroupResource($subjectGroup->load($this->eagerLoads()));
    }

    public function destroy(School $school, SubjectGroup $subjectGroup)
    {
        DB::transaction(function () use ($subjectGroup) {
            $subjectGroup->sections()->detach();
            $subjectGroup->subjects()->detach();
            $subjectGroup->delete();
        });

        return response()->noContent();
    }

    private function eagerLoads(): array
    {
        return [
            'grade',
            'sections' => fn($query) => $query->orderBy('title'),
            'subjects' => fn($query) => $query->orderBy('title'),
        ];
    }
}

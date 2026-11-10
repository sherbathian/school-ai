<?php

namespace App\Http\Controllers;

use App\Enums\RecordStatus;
use App\Http\Requests\GradeRequest;
use App\Http\Resources\GradeResource;
use App\Models\Grade;
use App\Models\School;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

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
                $grade->sections()->sync($data['section_ids']);
            }
        });

        return new GradeResource($this->withSections($grade));
    }

    public function destroy(School $school, Grade $grade)
    {
        DB::transaction(function () use ($grade) {
            $grade->sections()->detach();
            $grade->delete();
        });

        return response()->noContent();
    }

    private function withSections(Grade $grade): Grade
    {
        return $grade->load(['sections' => fn($query) => $query->orderBy('title')]);
    }
}

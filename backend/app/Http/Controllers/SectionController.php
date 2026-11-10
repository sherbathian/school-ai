<?php

namespace App\Http\Controllers;

use App\Enums\RecordStatus;
use App\Http\Requests\SectionRequest;
use App\Http\Resources\SectionResource;
use App\Models\School;
use App\Models\Section;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Validation\ValidationException;

class SectionController extends Controller implements HasMiddleware
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
        return SectionResource::collection(
            $school->sections()->orderBy('title')->get()
        );
    }

    public function store(SectionRequest $request, School $school)
    {
        $data = $request->validated();

        $section = $school->sections()->create([
            ...$data,
            'status' => $data['status'] ?? RecordStatus::Active->value,
        ]);

        // A freshly created model is returned with a 201 status automatically.
        return new SectionResource($section);
    }

    public function show(School $school, Section $section)
    {
        return new SectionResource($section);
    }

    public function update(SectionRequest $request, School $school, Section $section)
    {
        $section->update($request->validated());

        return new SectionResource($section);
    }

    public function destroy(School $school, Section $section)
    {
        if ($section->grades()->exists()) {
            throw ValidationException::withMessages([
                'section' => ['This section is used by a grade. Remove it from the grade first, or mark the section inactive instead.'],
            ]);
        }

        $section->delete();

        return response()->noContent();
    }
}

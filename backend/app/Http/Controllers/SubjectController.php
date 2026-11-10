<?php

namespace App\Http\Controllers;

use App\Enums\RecordStatus;
use App\Http\Requests\SubjectRequest;
use App\Http\Resources\SubjectResource;
use App\Models\School;
use App\Models\Subject;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class SubjectController extends Controller implements HasMiddleware
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
        return SubjectResource::collection(
            $school->subjects()->orderBy('title')->orderBy('code')->get()
        );
    }

    public function store(SubjectRequest $request, School $school)
    {
        $data = $request->validated();

        $subject = $school->subjects()->create([
            ...$data,
            'status' => $data['status'] ?? RecordStatus::Active->value,
        ]);

        // A freshly created model is returned with a 201 status automatically.
        return new SubjectResource($subject);
    }

    public function show(School $school, Subject $subject)
    {
        return new SubjectResource($subject);
    }

    public function update(SubjectRequest $request, School $school, Subject $subject)
    {
        $subject->update($request->validated());

        return new SubjectResource($subject);
    }

    public function destroy(School $school, Subject $subject)
    {
        $subject->delete();

        return response()->noContent();
    }
}

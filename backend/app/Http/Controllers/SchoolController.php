<?php

namespace App\Http\Controllers;

use App\Enums\SchoolStatus;
use App\Http\Requests\StoreSchoolRequest;
use App\Http\Requests\UpdateSchoolRequest;
use App\Http\Resources\SchoolResource;
use App\Models\School;
use Illuminate\Http\Request;

class SchoolController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $schools = $user->is_super_admin
            ? School::orderBy('name')->get()
            : $user->schools()->orderBy('name')->get();

        return SchoolResource::collection($schools);
    }

    public function show(School $school)
    {
        return new SchoolResource($school);
    }

    public function store(StoreSchoolRequest $request)
    {
        $data = $request->validated();

        $school = School::create([
            ...$data,
            'slug' => School::uniqueSlugFor($data['name']),
            'status' => $data['status'] ?? SchoolStatus::Active->value,
        ]);

        // A freshly created model is returned with a 201 status automatically.
        return new SchoolResource($school);
    }

    public function update(UpdateSchoolRequest $request, School $school)
    {
        $school->update($request->validated());

        return new SchoolResource($school);
    }

    public function destroy(School $school)
    {
        $school->delete();

        return response()->noContent();
    }
}

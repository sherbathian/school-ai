<?php

namespace App\Http\Controllers;

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
}

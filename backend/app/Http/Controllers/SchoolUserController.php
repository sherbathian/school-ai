<?php

namespace App\Http\Controllers;

use App\Enums\SchoolRole;
use App\Http\Requests\AttachSchoolUserRequest;
use App\Http\Requests\StoreSchoolUserRequest;
use App\Http\Requests\UpdateSchoolUserRequest;
use App\Http\Resources\SchoolMemberResource;
use App\Models\School;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SchoolUserController extends Controller
{
    public function index(School $school)
    {
        return SchoolMemberResource::collection(
            $school->users()->orderBy('users.name')->get()
        );
    }

    public function store(StoreSchoolUserRequest $request, School $school)
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data, $school) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
            ]);

            $school->users()->attach($user->id, ['role' => $data['role']]);

            return $user;
        });

        return $this->created($school, $user->id);
    }

    public function attach(AttachSchoolUserRequest $request, School $school)
    {
        $data = $request->validated();

        $user = User::where('email', $data['email'])->firstOrFail();
        $school->users()->attach($user->id, ['role' => $data['role']]);

        return $this->created($school, $user->id);
    }

    public function update(UpdateSchoolUserRequest $request, School $school, string $userId)
    {
        $member = $this->member($school, $userId);
        $newRole = $request->validated('role');

        DB::transaction(function () use ($school, $member, $newRole) {
            $this->ensureAnotherAdminRemains(
                $school,
                $member,
                $newRole === SchoolRole::Admin->value,
                'role',
            );

            $school->users()->updateExistingPivot($member->id, ['role' => $newRole]);
        });

        return new SchoolMemberResource($this->member($school, $userId));
    }

    public function destroy(School $school, string $userId)
    {
        $member = $this->member($school, $userId);

        DB::transaction(function () use ($school, $member) {
            $this->ensureAnotherAdminRemains($school, $member, false, 'user');

            $school->users()->detach($member->id);
        });

        return response()->noContent();
    }

    /** Look the person up through the school, so other schools' users are a 404. */
    private function member(School $school, string|int $userId): User
    {
        return $school->users()->where('users.id', $userId)->firstOrFail();
    }

    private function created(School $school, int $userId)
    {
        return (new SchoolMemberResource($this->member($school, $userId)))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * A school must always keep at least one admin. The admin rows are locked
     * so two simultaneous requests can't both remove "the other" admin.
     */
    private function ensureAnotherAdminRemains(School $school, User $member, bool $staysAdmin, string $field): void
    {
        if ($staysAdmin) {
            return;
        }

        $adminIds = DB::table('school_user')
            ->where('school_id', $school->id)
            ->where('role', SchoolRole::Admin->value)
            ->lockForUpdate()
            ->pluck('user_id');

        if ($adminIds->contains($member->id) && $adminIds->count() === 1) {
            throw ValidationException::withMessages([
                $field => ['A school must keep at least one admin.'],
            ]);
        }
    }
}

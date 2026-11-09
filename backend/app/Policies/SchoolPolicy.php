<?php

namespace App\Policies;

use App\Enums\SchoolRole;
use App\Models\School;
use App\Models\User;

class SchoolPolicy
{
    public function view(User $user, School $school): bool
    {
        return $user->roleIn($school) !== null;
    }

    public function manage(User $user, School $school): bool
    {
        return $user->roleIn($school) === SchoolRole::Admin;
    }

    public function update(User $user, School $school): bool
    {
        return $this->manage($user, $school);
    }

    // Only super admins create or delete schools. They pass through
    // Gate::before, so these return false for everyone else.
    public function create(User $user): bool
    {
        return false;
    }

    public function delete(User $user, School $school): bool
    {
        return false;
    }
}

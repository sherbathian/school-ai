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
}

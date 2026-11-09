<?php

namespace App\Models;

use App\Enums\SchoolRole;
use Illuminate\Database\Eloquent\Relations\Pivot;

class SchoolUser extends Pivot
{
    protected $table = 'school_user';

    public $incrementing = false;

    protected function casts(): array
    {
        return ['role' => SchoolRole::class];
    }
}

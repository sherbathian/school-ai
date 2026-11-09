<?php

namespace App\Models;

use App\Enums\SchoolStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

#[Fillable(['name', 'slug', 'status', 'url', 'phone', 'email', 'address', 'about'])]
class School extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return ['status' => SchoolStatus::class];
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->using(SchoolUser::class)
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * A URL-friendly, unique slug for a new school. Deleted schools are
     * included in the check because the unique index still covers them.
     */
    public static function uniqueSlugFor(string $name): string
    {
        $base = Str::slug($name) ?: 'school';
        $slug = $base;
        $suffix = 2;

        while (static::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $base . '-' . $suffix++;
        }

        return $slug;
    }
}

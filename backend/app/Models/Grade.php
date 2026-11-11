<?php

namespace App\Models;

use App\Enums\RecordStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

// school_id is deliberately not fillable: it is set through the school relation.
#[Fillable(['title', 'status'])]
class Grade extends Model
{
    protected function casts(): array
    {
        return ['status' => RecordStatus::class];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function sections(): BelongsToMany
    {
        return $this->belongsToMany(Section::class, 'grade_section');
    }

    public function subjectGroups(): HasMany
    {
        return $this->hasMany(SubjectGroup::class);
    }
}

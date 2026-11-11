<?php

namespace App\Models;

use App\Enums\RecordStatus;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

// school_id is deliberately not fillable: it is set through the school relation.
#[Fillable(['title', 'status'])]
class Section extends Model
{
    protected function casts(): array
    {
        return ['status' => RecordStatus::class];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function grades(): BelongsToMany
    {
        return $this->belongsToMany(Grade::class, 'grade_section');
    }

    public function subjectGroups(): BelongsToMany
    {
        return $this->belongsToMany(SubjectGroup::class, 'subject_group_section');
    }
}

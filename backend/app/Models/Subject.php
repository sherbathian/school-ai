<?php

namespace App\Models;

use App\Enums\RecordStatus;
use App\Enums\SubjectType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

// school_id is deliberately not fillable: it is set through the school relation.
#[Fillable(['title', 'code', 'type', 'status'])]
class Subject extends Model
{
    protected function casts(): array
    {
        return [
            'type' => SubjectType::class,
            'status' => RecordStatus::class,
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function subjectGroups(): BelongsToMany
    {
        return $this->belongsToMany(SubjectGroup::class, 'subject_group_subject');
    }
}

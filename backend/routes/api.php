<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GradeController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\SchoolController;
use App\Http\Controllers\SchoolUserController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\SubjectController;
use App\Models\School;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/me/password', [AuthController::class, 'changePassword'])
        ->middleware('throttle:5,1');

    Route::get('/schools', [SchoolController::class, 'index']);
    Route::post('/schools', [SchoolController::class, 'store'])
        ->middleware('can:create,' . School::class);
    Route::get('/schools/{school}', [SchoolController::class, 'show'])
        ->middleware('can:view,school');
    Route::match(['put', 'patch'], '/schools/{school}', [SchoolController::class, 'update'])
        ->middleware('can:update,school');
    Route::delete('/schools/{school}', [SchoolController::class, 'destroy'])
        ->middleware('can:delete,school');

    Route::get('/schools/{school}/users', [SchoolUserController::class, 'index'])
        ->middleware('can:manage,school');
    Route::post('/schools/{school}/users', [SchoolUserController::class, 'store'])
        ->middleware('can:manage,school');
    Route::post('/schools/{school}/users/attach', [SchoolUserController::class, 'attach'])
        ->middleware('can:attachExistingUser,school');
    Route::patch('/schools/{school}/users/{userId}', [SchoolUserController::class, 'update'])
        ->whereNumber('userId')
        ->middleware('can:manage,school');
    Route::delete('/schools/{school}/users/{userId}', [SchoolUserController::class, 'destroy'])
        ->whereNumber('userId')
        ->middleware('can:manage,school');

    Route::apiResource('schools.sections', SectionController::class)->scoped();
    Route::apiResource('schools.grades', GradeController::class)->scoped();
    Route::apiResource('schools.subjects', SubjectController::class)->scoped();
});

<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\HealthController;
use App\Http\Controllers\SchoolController;
use App\Models\School;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/schools', [SchoolController::class, 'index']);
    Route::post('/schools', [SchoolController::class, 'store'])
        ->middleware('can:create,' . School::class);
    Route::get('/schools/{school}', [SchoolController::class, 'show'])
        ->middleware('can:view,school');
    Route::match(['put', 'patch'], '/schools/{school}', [SchoolController::class, 'update'])
        ->middleware('can:update,school');
    Route::delete('/schools/{school}', [SchoolController::class, 'destroy'])
        ->middleware('can:delete,school');
});

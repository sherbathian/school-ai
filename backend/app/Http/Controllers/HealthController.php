<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::select('select 1');
            $database = 'up';
        } catch (Throwable) {
            $database = 'down';
        }

        return response()->json([
            'status' => $database === 'up' ? 'ok' : 'degraded',
            'database' => $database,
        ], $database === 'up' ? 200 : 503);
    }
}

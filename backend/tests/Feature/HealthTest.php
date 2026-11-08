<?php

use Illuminate\Support\Facades\DB;

it('reports ok when the database is reachable', function () {
    $this->getJson('/api/health')
        ->assertOk()
        ->assertExactJson(['status' => 'ok', 'database' => 'up']);
});

it('reports 503 and hides the error when the database is down', function () {
    DB::partialMock()
        ->shouldReceive('select')
        ->andThrow(new RuntimeException('secret connection detail'));

    $this->getJson('/api/health')
        ->assertStatus(503)
        ->assertExactJson(['status' => 'degraded', 'database' => 'down'])
        ->assertDontSee('secret connection detail');
});

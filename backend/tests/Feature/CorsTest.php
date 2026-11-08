<?php

it('allows the frontend origin', function () {
    $this->withHeaders(['Origin' => 'http://localhost:5173'])
        ->getJson('/api/health')
        ->assertOk()
        ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
});

it('never grants access to other origins', function () {
    $response = $this->withHeaders(['Origin' => 'http://evil.example'])
        ->getJson('/api/health')
        ->assertOk();

    $allowed = $response->headers->get('Access-Control-Allow-Origin');

    // Either no header, or one that names only our frontend.
    expect($allowed)->not->toBe('*');
    expect($allowed)->not->toBe('http://evil.example');
});

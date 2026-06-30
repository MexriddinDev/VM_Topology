<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Prometheus URL
    |--------------------------------------------------------------------------
    | The base URL of your Prometheus instance.
    | Default: http://localhost:9090
    */
    'url' => env('PROMETHEUS_URL', 'http://172.28.6.55:9090'),

    /*
    |--------------------------------------------------------------------------
    | Query Timeout (seconds)
    |--------------------------------------------------------------------------
    */
    'timeout' => env('PROMETHEUS_TIMEOUT', 5),

    /*
    |--------------------------------------------------------------------------
    | Cache TTL (seconds)
    |--------------------------------------------------------------------------
    | How long to cache Prometheus responses. Set to 0 to disable.
    */
    'cache_ttl' => env('PROMETHEUS_CACHE_TTL', 5),
];

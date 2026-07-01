<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlertEvent extends Model
{
    protected $fillable = [
        'fingerprint',
        'severity',
        'type',
        'instance',
        'message',
        'value',
        'status',
        'first_seen_at',
        'last_seen_at',
        'resolved_at',
        'payload',
    ];

    protected $casts = [
        'value' => 'float',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'resolved_at' => 'datetime',
        'payload' => 'array',
    ];
}

<?php

namespace Database\Seeders;

use App\Models\Topology;
use App\Models\TopologyNode;
use Illuminate\Database\Seeder;

class TopologySeeder extends Seeder
{
    public function run(): void
    {
        if (Topology::query()->exists()) {
            return;
        }

        $main = Topology::create([
            'name'          => 'Production Network',
            'description'   => 'Main VM topology — all production servers',
            'viewport_x'    => 0,
            'viewport_y'    => 0,
            'viewport_zoom' => 0.65,
            'is_default'    => true,
            'sort_order'    => 0,
        ]);

        Topology::create([
            'name'          => 'Staging Cluster',
            'description'   => 'Staging environment VMs',
            'viewport_x'    => 0,
            'viewport_y'    => 0,
            'viewport_zoom' => 0.7,
            'is_default'    => false,
            'sort_order'    => 1,
        ]);
    }
}

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, Car, Ship, Factory, Store, Wrench, 
  Cpu, Users, BookOpen, Shield, Activity, TrendingUp 
} from 'lucide-react';

export function IndustryShowcase() {
  const industries = [
    {
      name: 'Training Centers',
      icon: GraduationCap,
      color: 'cyan',
      examples: ['Trade Schools', 'Certification Programs', 'Safety Training'],
      users: '50K+ Instructors'
    },
    {
      name: 'Automotive',
      icon: Car,
      color: 'blue',
      examples: ['Local Shops', 'Dealerships', 'Fleet Service'],
      users: '100K+ Technicians'
    },
    {
      name: 'Marine & RV',
      icon: Ship,
      color: 'purple',
      examples: ['Boat Repair', 'RV Service', 'Mobile Tech'],
      users: '75K+ Specialists'
    },
    {
      name: 'Manufacturing',
      icon: Factory,
      color: 'green',
      examples: ['Assembly', 'Quality Control', 'Maintenance'],
      users: 'Enterprise Scale'
    },
    {
      name: 'Welding',
      icon: Wrench,
      color: 'orange',
      examples: ['MIG/TIG', 'Fabrication', 'New Materials'],
      users: '40K+ Welders'
    },
    {
      name: 'Local Shops',
      icon: Store,
      color: 'pink',
      examples: ['Small Business', 'Family Owned', 'Community'],
      users: '200K+ Shops'
    }
  ];

  const stats = [
    { label: 'Active Users', value: '500K+', icon: Users },
    { label: 'Procedures', value: '1M+', icon: BookOpen },
    { label: 'Compliance', value: '100%', icon: Shield },
    { label: 'Efficiency', value: '+47%', icon: TrendingUp }
  ];

  return (
    <div className="w-full space-y-6">
      {/* Industry Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {industries.map((industry) => {
          const Icon = industry.icon;
          return (
            <Card 
              key={industry.name}
              className={`bg-gray-900/50 border-${industry.color}-500/30 hover:border-${industry.color}-500/50 transition-all cursor-pointer group`}
            >
              <div className="p-4 space-y-3">
                <div className={`w-10 h-10 rounded-lg bg-${industry.color}-500/20 flex items-center justify-center group-hover:bg-${industry.color}-500/30 transition-colors`}>
                  <Icon className={`w-5 h-5 text-${industry.color}-400`} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">{industry.name}</h4>
                  <p className="text-xs text-gray-400 mt-1">{industry.users}</p>
                </div>
                <div className="space-y-1">
                  {industry.examples.map((example, idx) => (
                    <div key={idx} className="text-xs text-gray-500">• {example}</div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="flex items-center gap-3 bg-gray-900/30 rounded-lg p-3">
              <Icon className="w-8 h-8 text-cyan-400" />
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-400">{stat.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mission Statement */}
      <Card className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border-cyan-500/30">
        <div className="p-6 text-center">
          <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
            Professional Training Across All Industries
          </h3>
          <p className="text-gray-300 max-w-3xl mx-auto">
            SOPGRID serves professionals at every skill level. From apprentices learning the trade, 
            journeymen refining their craft, to master technicians solving complex problems - 
            we provide the knowledge platform that scales from local shops to enterprise operations.
          </p>
        </div>
      </Card>
    </div>
  );
}
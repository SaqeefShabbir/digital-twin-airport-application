import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscription, interval, BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface AirportResource {
  id: string;
  name: string;
  type: 'GATE' | 'EQUIPMENT' | 'VEHICLE' | 'STAFF' | 'FACILITY' | 'UTILITY';
  category: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RESERVED' | 'UNAVAILABLE';
  location?: string;
  terminal?: string;
  capacity?: number;
  currentUtilization?: number;
  assignedTo?: string;
  scheduledMaintenance?: Date;
  lastUpdated: Date;
  metadata?: any;
}

export interface ResourceAllocation {
  resourceId: string;
  flightNumber?: string;
  task?: string;
  startTime: Date;
  endTime?: Date;
  assignedStaff?: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}

export interface MaintenanceSchedule {
  id: string;
  resourceId: string;
  resourceName: string;
  type: 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY';
  scheduledDate: Date;
  estimatedDuration: number; // hours
  assignedTeam?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';
  description?: string;
}

export interface ResourceUtilization {
  resourceType: string;
  totalCount: number;
  availableCount: number;
  utilizationRate: number;
  avgUtilization: number;
  peakUtilization: number;
}

export interface StaffResource {
  id: string;
  name: string;
  role: 'GROUND_CREW' | 'TECHNICIAN' | 'SECURITY' | 'ADMIN' | 'SUPERVISOR';
  department: string;
  status: 'AVAILABLE' | 'BUSY' | 'ON_BREAK' | 'OFF_DUTY';
  currentTask?: string;
  location?: string;
  skills: string[];
  experienceLevel: 'JUNIOR' | 'MID' | 'SENIOR' | 'LEAD';
}

export interface EquipmentResource {
  id: string;
  name: string;
  type: 'BAGGAGE_CARTS' | 'PUSH_BACK' | 'FUEL_TRUCK' | 'CATERING_TRUCK' | 'CLEANING' | 'DEICING';
  status: 'OPERATIONAL' | 'IN_USE' | 'MAINTENANCE' | 'RESERVED';
  fuelLevel?: number;
  lastService?: Date;
  location?: string;
  assignedTo?: string;
}

@Component({
  selector: 'app-resource-management',
  templateUrl: './resource-management.html',
  standalone: false,
  styleUrls: ['./resource-management.scss'],
})
export class ResourceManagement implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('resourceChart') resourceChart!: ElementRef;
  @ViewChild('timelineCanvas') timelineCanvas!: ElementRef;
  
  // Data
  resources: AirportResource[] = [];
  allocations: ResourceAllocation[] = [];
  maintenanceSchedules: MaintenanceSchedule[] = [];
  staffResources: StaffResource[] = [];
  equipmentResources: EquipmentResource[] = [];
  utilizationStats: ResourceUtilization[] = [];
  
  // Filtering
  selectedResourceType: string = 'ALL';
  selectedStatus: string = 'ALL';
  selectedTerminal: string = 'ALL';
  selectedCategory: string = 'ALL';
  
  // Search
  searchQuery: string = '';
  private searchSubject = new BehaviorSubject<string>('');
  
  // View modes
  viewMode: 'DASHBOARD' | 'INVENTORY' | 'ALLOCATIONS' | 'MAINTENANCE' | 'STAFF' | 'EQUIPMENT' = 'DASHBOARD';
  selectedResource: AirportResource | null = null;
  selectedStaff: StaffResource | null = null;
  selectedEquipment: EquipmentResource | null = null;
  
  // Time range
  timeRange: 'TODAY' | 'WEEK' | 'MONTH' = 'TODAY';
  
  // UI State
  isLoading: boolean = false;
  showFilters: boolean = true;
  autoRefresh: boolean = true;
  refreshInterval: number = 30000; // 30 seconds
  
  // Stats
  stats = {
    totalResources: 0,
    availableResources: 0,
    inUseResources: 0,
    maintenanceResources: 0,
    totalStaff: 0,
    availableStaff: 0,
    totalEquipment: 0,
    availableEquipment: 0,
    overallUtilization: 0
  };
  
  // Resource types
  resourceTypes = [
    { value: 'GATE', label: 'Gates', icon: 'gate' },
    { value: 'EQUIPMENT', label: 'Equipment', icon: 'build' },
    { value: 'VEHICLE', label: 'Vehicles', icon: 'directions_car' },
    { value: 'STAFF', label: 'Staff', icon: 'people' },
    { value: 'FACILITY', label: 'Facilities', icon: 'apartment' },
    { value: 'UTILITY', label: 'Utilities', icon: 'bolt' }
  ];
  
  // Status options
  statusOptions = [
    { value: 'AVAILABLE', label: 'Available', color: '#4CAF50' },
    { value: 'IN_USE', label: 'In Use', color: '#2196F3' },
    { value: 'MAINTENANCE', label: 'Maintenance', color: '#FF9800' },
    { value: 'RESERVED', label: 'Reserved', color: '#9C27B0' },
    { value: 'UNAVAILABLE', label: 'Unavailable', color: '#F44336' }
  ];
  
  // Terminals
  terminals = ['T1', 'T2', 'T3', 'T4', 'T5', 'ALL'];
  
  // Categories
  categories = [
    'GROUND_HANDLING',
    'PASSENGER_SERVICES',
    'SECURITY',
    'MAINTENANCE',
    'OPERATIONS',
    'ADMINISTRATION'
  ];
  
  // Staff roles
  staffRoles = [
    'GROUND_CREW',
    'TECHNICIAN',
    'SECURITY',
    'ADMIN',
    'SUPERVISOR',
    'MANAGER'
  ];
  
  // Equipment types
  equipmentTypes = [
    'BAGGAGE_CARTS',
    'PUSH_BACK',
    'FUEL_TRUCK',
    'CATERING_TRUCK',
    'CLEANING',
    'DEICING',
    'STAIRS',
    'BUS'
  ];
  
  // Subscriptions
  private dataSubscription!: Subscription;
  private refreshSubscription!: Subscription;
  private searchSubscription!: Subscription;
  
  // Chart variables
  private chartContext!: CanvasRenderingContext2D;
  private timelineContext!: CanvasRenderingContext2D;
  
  // Mock data
  private mockGates = Array.from({ length: 25 }, (_, i) => `G${(i + 1).toString().padStart(2, '0')}`);
  private mockEquipment = [
    'Fuel Truck 01', 'Baggage Cart 01', 'Push Back 01', 'Catering Truck 01',
    'Cleaning Cart 01', 'Deicing Truck 01', 'Stairs 01', 'Passenger Bus 01'
  ];
  
  constructor() {}
  
  ngOnInit(): void {
    this.initializeSearch();
    this.loadAllData();
    this.startAutoRefresh();
  }
  
  ngAfterViewInit(): void {
    this.initializeCharts();
  }
  
  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }
  
  private initializeSearch(): void {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery = query;
      this.applyFilters();
    });
  }
  
  onSearchChange(query: string): void {
    this.searchSubject.next(query);
  }
  
  loadAllData(): void {
    this.isLoading = true;
    
    // Simulate API calls
    setTimeout(() => {
      this.generateMockResources();
      this.generateMockAllocations();
      this.generateMockMaintenance();
      this.generateMockStaff();
      this.generateMockEquipment();
      this.calculateUtilizationStats();
      this.calculateStatistics();
      this.isLoading = false;
      
      // Update charts
      setTimeout(() => {
        this.updateResourceChart();
        this.updateTimeline();
      }, 100);
    }, 1000);
  }
  
  private generateMockResources(): void {
    this.resources = [];
    
    // Gates
    this.mockGates.forEach((gate, index) => {
      const statuses: AirportResource['status'][] = ['AVAILABLE', 'IN_USE', 'RESERVED', 'MAINTENANCE'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const terminal = `T${Math.floor(index / 5) + 1}`;
      
      this.resources.push({
        id: `GATE_${gate}`,
        name: `Gate ${gate}`,
        type: 'GATE',
        category: 'GROUND_HANDLING',
        status,
        location: `${terminal} - Concourse ${String.fromCharCode(65 + (index % 3))}`,
        terminal,
        capacity: 200,
        currentUtilization: status === 'IN_USE' ? Math.floor(Math.random() * 200) : 0,
        assignedTo: status === 'IN_USE' ? `FL${Math.floor(Math.random() * 9000) + 1000}` : undefined,
        lastUpdated: new Date()
      });
    });
    
    // Equipment
    this.mockEquipment.forEach((equip, index) => {
      const statuses: AirportResource['status'][] = ['AVAILABLE', 'IN_USE', 'MAINTENANCE'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      this.resources.push({
        id: `EQUIP_${index + 1}`,
        name: equip,
        type: 'EQUIPMENT',
        category: 'GROUND_HANDLING',
        status,
        location: `Equipment Bay ${Math.floor(index / 4) + 1}`,
        assignedTo: status === 'IN_USE' ? `FL${Math.floor(Math.random() * 9000) + 1000}` : undefined,
        lastUpdated: new Date()
      });
    });
    
    // Vehicles
    for (let i = 1; i <= 10; i++) {
      const statuses: AirportResource['status'][] = ['AVAILABLE', 'IN_USE', 'MAINTENANCE'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      this.resources.push({
        id: `VEHICLE_${i}`,
        name: `Service Vehicle ${i}`,
        type: 'VEHICLE',
        category: 'OPERATIONS',
        status,
        location: `Vehicle Pool ${Math.ceil(i / 5)}`,
        assignedTo: status === 'IN_USE' ? `Team ${Math.ceil(Math.random() * 5)}` : undefined,
        lastUpdated: new Date()
      });
    }
  }
  
  private generateMockAllocations(): void {
    this.allocations = [];
    const now = new Date();
    
    // Generate allocations for next 6 hours
    for (let i = 0; i < 15; i++) {
      const resource = this.resources[Math.floor(Math.random() * this.resources.length)];
      const startTime = new Date(now.getTime() + Math.random() * 6 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + (Math.random() * 2 + 1) * 60 * 60 * 1000);
      
      this.allocations.push({
        resourceId: resource.id,
        flightNumber: Math.random() > 0.5 ? `FL${Math.floor(Math.random() * 9000) + 1000}` : undefined,
        task: ['Baggage Handling', 'Fueling', 'Cleaning', 'Catering', 'Push Back'][Math.floor(Math.random() * 5)],
        startTime,
        endTime,
        assignedStaff: [`Staff${Math.floor(Math.random() * 100)}`, `Staff${Math.floor(Math.random() * 100)}`],
        priority: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)] as any,
        status: ['SCHEDULED', 'ACTIVE', 'COMPLETED'][Math.floor(Math.random() * 3)] as any
      });
    }
    
    // Sort by start time
    this.allocations.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }
  
  private generateMockMaintenance(): void {
    this.maintenanceSchedules = [];
    const now = new Date();
    
    for (let i = 0; i < 8; i++) {
      const resource = this.resources[Math.floor(Math.random() * this.resources.length)];
      const scheduledDate = new Date(now.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000);
      
      this.maintenanceSchedules.push({
        id: `MAINT_${i + 1}`,
        resourceId: resource.id,
        resourceName: resource.name,
        type: ['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY'][Math.floor(Math.random() * 3)] as any,
        scheduledDate,
        estimatedDuration: Math.floor(Math.random() * 8) + 2,
        assignedTeam: `Maintenance Team ${Math.ceil(Math.random() * 3)}`,
        status: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'][Math.floor(Math.random() * 3)] as any,
        description: `Scheduled maintenance for ${resource.name}`
      });
    }
    
    // Sort by date
    this.maintenanceSchedules.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }
  
  private generateMockStaff(): void {
    this.staffResources = [];
    const names = ['John Smith', 'Maria Garcia', 'David Lee', 'Sarah Johnson', 'Robert Chen', 
                   'Emily Wilson', 'Michael Brown', 'Jennifer Davis', 'James Miller', 'Lisa Taylor'];
    
    names.forEach((name, index) => {
      const role = this.staffRoles[Math.floor(Math.random() * this.staffRoles.length)];
      const statuses: StaffResource['status'][] = ['AVAILABLE', 'BUSY', 'ON_BREAK', 'OFF_DUTY'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      this.staffResources.push({
        id: `STAFF_${index + 1}`,
        name,
        role: role as any,
        department: ['Ground Operations', 'Maintenance', 'Security', 'Administration'][Math.floor(index / 3)],
        status,
        currentTask: status === 'BUSY' ? 
          ['Gate Assignment', 'Equipment Check', 'Security Patrol', 'Document Processing'][Math.floor(Math.random() * 4)] : undefined,
        location: status === 'AVAILABLE' ? 'Operations Center' : `Terminal ${Math.ceil(Math.random() * 5)}`,
        skills: ['Communication', 'Safety', 'Equipment Operation', 'Problem Solving'].slice(0, Math.ceil(Math.random() * 4)),
        experienceLevel: ['JUNIOR', 'MID', 'SENIOR', 'LEAD'][Math.floor(Math.random() * 4)] as any
      });
    });
  }
  
  private generateMockEquipment(): void {
    this.equipmentResources = [];
    
    for (let i = 1; i <= 12; i++) {
      const type = this.equipmentTypes[Math.floor(Math.random() * this.equipmentTypes.length)];
      const statuses: EquipmentResource['status'][] = ['OPERATIONAL', 'IN_USE', 'MAINTENANCE', 'RESERVED'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const now = new Date();
      
      this.equipmentResources.push({
        id: `EQ${i.toString().padStart(3, '0')}`,
        name: `${type.replace('_', ' ')} ${i}`,
        type: type as any,
        status,
        fuelLevel: type.includes('TRUCK') ? Math.floor(Math.random() * 100) : undefined,
        lastService: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        location: `Equipment Bay ${Math.ceil(i / 4)}`,
        assignedTo: status === 'IN_USE' ? `FL${Math.floor(Math.random() * 9000) + 1000}` : undefined
      });
    }
  }
  
  private calculateUtilizationStats(): void {
    this.utilizationStats = [];
    
    // Calculate by resource type
    this.resourceTypes.forEach(type => {
      const resourcesOfType = this.resources.filter(r => r.type === type.value);
      const totalCount = resourcesOfType.length;
      const availableCount = resourcesOfType.filter(r => r.status === 'AVAILABLE').length;
      const inUseCount = resourcesOfType.filter(r => r.status === 'IN_USE').length;
      
      if (totalCount > 0) {
        this.utilizationStats.push({
          resourceType: type.label,
          totalCount,
          availableCount,
          utilizationRate: (inUseCount / totalCount) * 100,
          avgUtilization: (inUseCount / totalCount) * 100,
          peakUtilization: (inUseCount / totalCount) * 100 * 1.2 // Simulated peak
        });
      }
    });
  }
  
  private calculateStatistics(): void {
    const totalResources = this.resources.length;
    const availableResources = this.resources.filter(r => r.status === 'AVAILABLE').length;
    const inUseResources = this.resources.filter(r => r.status === 'IN_USE').length;
    const maintenanceResources = this.resources.filter(r => r.status === 'MAINTENANCE').length;
    const totalStaff = this.staffResources.length;
    const availableStaff = this.staffResources.filter(s => s.status === 'AVAILABLE').length;
    const totalEquipment = this.equipmentResources.length;
    const availableEquipment = this.equipmentResources.filter(e => e.status === 'OPERATIONAL').length;
    
    this.stats = {
      totalResources,
      availableResources,
      inUseResources,
      maintenanceResources,
      totalStaff,
      availableStaff,
      totalEquipment,
      availableEquipment,
      overallUtilization: totalResources > 0 ? (inUseResources / totalResources) * 100 : 0
    };
  }
  
  private startAutoRefresh(): void {
    if (this.autoRefresh) {
      this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
        if (!this.isLoading) {
          this.updateRealTimeData();
        }
      });
    }
  }
  
  private updateRealTimeData(): void {
    // Simulate real-time updates
    this.resources.forEach(resource => {
      if (resource.status === 'IN_USE' && Math.random() > 0.7) {
        resource.status = 'AVAILABLE';
        resource.assignedTo = undefined;
      } else if (resource.status === 'AVAILABLE' && Math.random() > 0.9) {
        resource.status = 'IN_USE';
        resource.assignedTo = `FL${Math.floor(Math.random() * 9000) + 1000}`;
      }
      resource.lastUpdated = new Date();
    });
    
    this.calculateStatistics();
    this.updateResourceChart();
  }
  
  applyFilters(): void {
    // Filtering logic would be applied here
    this.calculateStatistics();
  }
  
  setViewMode(mode: 'DASHBOARD' | 'INVENTORY' | 'ALLOCATIONS' | 'MAINTENANCE' | 'STAFF' | 'EQUIPMENT'): void {
    this.viewMode = mode;
    this.selectedResource = null;
    this.selectedStaff = null;
    this.selectedEquipment = null;
    
    // Update charts based on view
    setTimeout(() => {
      if (mode === 'DASHBOARD') {
        this.updateResourceChart();
      } else if (mode === 'ALLOCATIONS') {
        this.updateTimeline();
      }
    }, 100);
  }
  
  selectResource(resource: AirportResource): void {
    this.selectedResource = resource;
  }
  
  selectStaff(staff: StaffResource): void {
    this.selectedStaff = staff;
  }
  
  selectEquipment(equipment: EquipmentResource): void {
    this.selectedEquipment = equipment;
  }
  
  clearSelection(): void {
    this.selectedResource = null;
    this.selectedStaff = null;
    this.selectedEquipment = null;
  }
  
  updateResourceStatus(resourceId: string, status: AirportResource['status']): void {
    const resource = this.resources.find(r => r.id === resourceId);
    if (resource) {
      resource.status = status;
      resource.lastUpdated = new Date();
      this.calculateStatistics();
    }
  }
  
  allocateResource(resourceId: string, allocation: Partial<ResourceAllocation>): void {
    const resource = this.resources.find(r => r.id === resourceId);
    if (resource) {
      resource.status = 'IN_USE';
      resource.assignedTo = allocation.flightNumber;
      resource.lastUpdated = new Date();
      
      this.allocations.push({
        resourceId,
        flightNumber: allocation.flightNumber,
        task: allocation.task,
        startTime: new Date(),
        priority: allocation.priority || 'MEDIUM',
        status: 'ACTIVE',
        ...allocation
      } as ResourceAllocation);
      
      this.calculateStatistics();
    }
  }
  
  releaseResource(resourceId: string): void {
    const resource = this.resources.find(r => r.id === resourceId);
    if (resource) {
      resource.status = 'AVAILABLE';
      resource.assignedTo = undefined;
      resource.lastUpdated = new Date();
      
      // Mark allocation as completed
      const allocation = this.allocations.find(a => 
        a.resourceId === resourceId && a.status === 'ACTIVE'
      );
      if (allocation) {
        allocation.status = 'COMPLETED';
        allocation.endTime = new Date();
      }
      
      this.calculateStatistics();
    }
  }
  
  scheduleMaintenance(resourceId: string, schedule: Partial<MaintenanceSchedule>): void {
    const resource = this.resources.find(r => r.id === resourceId);
    if (resource) {
      this.maintenanceSchedules.push({
        id: `MAINT_${this.maintenanceSchedules.length + 1}`,
        resourceId,
        resourceName: resource.name,
        type: 'PREVENTIVE',
        scheduledDate: new Date(),
        estimatedDuration: 4,
        status: 'SCHEDULED',
        ...schedule
      } as MaintenanceSchedule);
      
      resource.status = 'MAINTENANCE';
      resource.scheduledMaintenance = schedule.scheduledDate;
    }
  }
  
  getStatusColor(status: string): string {
    const statusOption = this.statusOptions.find(s => s.value === status);
    return statusOption?.color || '#757575';
  }
  
  getStatusClass(status: string): string {
    return status.toLowerCase().replace('_', '-');
  }
  
  getResourceTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      'GATE': 'gate',
      'EQUIPMENT': 'build',
      'VEHICLE': 'directions_car',
      'STAFF': 'people',
      'FACILITY': 'apartment',
      'UTILITY': 'bolt'
    };
    return icons[type] || 'help';
  }
  
  getStaffStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'AVAILABLE': 'status-available',
      'BUSY': 'status-busy',
      'ON_BREAK': 'status-break',
      'OFF_DUTY': 'status-off'
    };
    return classes[status] || '';
  }
  
  getEquipmentStatusClass(status: string): string {
    const classes: Record<string, string> = {
      'OPERATIONAL': 'status-available',
      'IN_USE': 'status-busy',
      'MAINTENANCE': 'status-maintenance',
      'RESERVED': 'status-reserved'
    };
    return classes[status] || '';
  }
  
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }
  
  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.refreshSubscription?.unsubscribe();
    }
  }
  
  refreshData(): void {
    this.isLoading = true;
    this.loadAllData();
  }
  
  exportReport(): void {
    // Implement export functionality
    console.log('Exporting resource management report...');
  }
  
  // Chart Methods
  private initializeCharts(): void {
    if (this.resourceChart) {
      const canvas = this.resourceChart.nativeElement;
      this.chartContext = canvas.getContext('2d');
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = 300;
    }
    
    if (this.timelineCanvas) {
      const canvas = this.timelineCanvas.nativeElement;
      this.timelineContext = canvas.getContext('2d');
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = 400;
    }
  }
  
  private updateResourceChart(): void {
    if (!this.chartContext || !this.utilizationStats.length) return;
    
    const canvas = this.resourceChart.nativeElement;
    const ctx = this.chartContext;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let i = 0; i <= 5; i++) {
      const x = padding + (chartWidth / 5) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // Draw bars
    const barWidth = chartWidth / this.utilizationStats.length * 0.6;
    const gap = chartWidth / this.utilizationStats.length * 0.4;
    
    this.utilizationStats.forEach((stat, index) => {
      const x = padding + (barWidth + gap) * index;
      const barHeight = (stat.utilizationRate / 100) * chartHeight;
      const y = height - padding - barHeight;
      
      // Draw bar
      ctx.fillStyle = this.getStatusColor('IN_USE');
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Draw value label
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(
        `${stat.utilizationRate.toFixed(0)}%`, 
        x + barWidth / 2, 
        y - 10
      );
      
      // Draw type label
      ctx.fillText(
        stat.resourceType, 
        x + barWidth / 2, 
        height - padding + 20
      );
    });
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Resource Utilization by Type', width / 2, padding - 10);
  }
  
  private updateTimeline(): void {
    if (!this.timelineContext || !this.allocations.length) return;
    
    const canvas = this.timelineCanvas.nativeElement;
    const ctx = this.timelineContext;
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Draw timeline
    const now = new Date();
    const sixHoursLater = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    
    // Draw time axis
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
    
    // Draw time labels
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    for (let i = 0; i <= 6; i++) {
      const time = new Date(now.getTime() + i * 60 * 60 * 1000);
      const x = padding + (i / 6) * (width - padding * 2);
      ctx.fillText(
        time.getHours().toString().padStart(2, '0') + ':00',
        x,
        height - padding + 20
      );
    }
    
    // Draw allocations
    const rowHeight = 30;
    const rows = this.allocations.slice(0, 10); // Show first 10
    
    rows.forEach((allocation, index) => {
      const rowY = padding + index * rowHeight;
      const startTime = new Date(allocation.startTime);
      const endTime = allocation.endTime || new Date(startTime.getTime() + 60 * 60 * 1000);
      
      // Calculate positions
      const startX = padding + ((startTime.getTime() - now.getTime()) / (sixHoursLater.getTime() - now.getTime())) * (width - padding * 2);
      const endX = padding + ((endTime.getTime() - now.getTime()) / (sixHoursLater.getTime() - now.getTime())) * (width - padding * 2);
      
      // Draw allocation bar
      ctx.fillStyle = this.getStatusColor('IN_USE');
      ctx.fillRect(startX, rowY, endX - startX, rowHeight - 10);
      
      // Draw allocation label
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(
        allocation.flightNumber || allocation.task || 'Allocation',
        startX + 5,
        rowY + (rowHeight - 10) / 2 + 3
      );
    });
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Resource Allocation Timeline (Next 6 Hours)', width / 2, padding - 10);
  }
  
  private cleanupSubscriptions(): void {
    this.dataSubscription?.unsubscribe();
    this.refreshSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
  }
}
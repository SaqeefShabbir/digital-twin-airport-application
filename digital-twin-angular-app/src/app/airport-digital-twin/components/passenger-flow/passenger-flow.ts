import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscription, timer, interval, BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

export interface PassengerFlowData {
  timestamp: Date;
  totalPassengers: number;
  activePassengers: number;
  byTerminal: {
    terminal: string;
    passengerCount: number;
    capacity: number;
    utilization: number;
  }[];
  byArea: {
    area: string;
    passengerCount: number;
    capacity: number;
    queueLength: number;
    averageWaitTime: number;
  }[];
  peakHours: {
    hour: number;
    passengerCount: number;
  }[];
  alerts: PassengerFlowAlert[];
}

export interface PassengerFlowAlert {
  id: string;
  area: string;
  type: 'HIGH_CONGESTION' | 'LONG_WAIT' | 'CAPACITY_EXCEEDED' | 'EQUIPMENT_ISSUE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface TerminalFlow {
  terminal: string;
  checkIn: {
    queues: number;
    averageWait: number;
    utilization: number;
  };
  security: {
    queues: number;
    averageWait: number;
    utilization: number;
  };
  immigration: {
    queues: number;
    averageWait: number;
    utilization: number;
  };
  baggage: {
    waitTime: number;
    utilization: number;
  };
}

@Component({
  selector: 'app-passenger-flow',
  templateUrl: './passenger-flow.html',
  standalone: false,
  styleUrls: ['./passenger-flow.scss']
})
export class PassengerFlow implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('flowChart') flowChart!: ElementRef;
  @ViewChild('heatmapCanvas') heatmapCanvas!: ElementRef;
  
  // Data
  flowData: PassengerFlowData | null = null;
  terminalFlows: TerminalFlow[] = [];
  realTimeUpdates: any[] = [];
  
  // Filters
  selectedTerminal: string = 'ALL';
  selectedArea: string = 'ALL';
  selectedTimeRange: 'REALTIME' | 'HOUR' | 'DAY' | 'WEEK' = 'REALTIME';
  showHeatmap: boolean = true;
  showAlerts: boolean = true;
  autoRefresh: boolean = true;
  
  // Search
  searchTerm: string = '';
  private searchSubject = new BehaviorSubject<string>('');
  
  // Statistics
  stats = {
    totalPassengers: 0,
    peakHourPassengers: 0,
    averageWaitTime: 0,
    maxWaitTime: 0,
    capacityUtilization: 0,
    alertsCount: 0
  };
  
  // UI State
  isLoading: boolean = false;
  isChartLoading: boolean = false;
  viewMode: 'OVERVIEW' | 'TERMINAL_DETAIL' | 'AREA_ANALYTICS' = 'OVERVIEW';
  selectedTerminalDetail: string = '';
  selectedAreaDetail: string = '';
  
  // Time periods
  timeRanges = [
    { label: 'Real-time', value: 'REALTIME' },
    { label: 'Last Hour', value: 'HOUR' },
    { label: 'Last 24 Hours', value: 'DAY' },
    { label: 'Last Week', value: 'WEEK' }
  ];
  
  // Areas
  areas = [
    'CHECK_IN',
    'SECURITY',
    'IMMIGRATION',
    'BAGGAGE_CLAIM',
    'RETAIL',
    'LOUNGES',
    'GATES',
    'TRANSPORT'
  ];
  
  // Terminals
  terminals = ['T1', 'T2', 'T3', 'T4', 'T5'];
  
  // Subscriptions
  private dataSubscription!: Subscription;
  private realTimeSubscription!: Subscription;
  private searchSubscription!: Subscription;
  private chartUpdateSubscription!: Subscription;
  
  // Chart variables
  private heatmapContext!: CanvasRenderingContext2D;
  private heatmapData: any[] = [];
  
  // Mock data for demonstration
  private mockAreas = [
    { area: 'CHECK_IN', capacity: 500, basePassengers: 150 },
    { area: 'SECURITY', capacity: 300, basePassengers: 120 },
    { area: 'IMMIGRATION', capacity: 200, basePassengers: 80 },
    { area: 'BAGGAGE_CLAIM', capacity: 400, basePassengers: 200 },
    { area: 'RETAIL', capacity: 600, basePassengers: 300 },
    { area: 'LOUNGES', capacity: 150, basePassengers: 90 },
    { area: 'GATES', capacity: 800, basePassengers: 400 },
    { area: 'TRANSPORT', capacity: 300, basePassengers: 150 }
  ];
  
  constructor() {}
  
  ngOnInit(): void {
    this.initializeSearch();
    this.loadPassengerFlowData();
    this.loadTerminalFlows();
    this.startRealTimeUpdates();
    this.startChartUpdates();
  }
  
  ngAfterViewInit(): void {
    this.initializeHeatmap();
  }
  
  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }
  
  private initializeSearch(): void {
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.applyFilters();
    });
  }
  
  onSearchChange(searchTerm: string): void {
    this.searchSubject.next(searchTerm);
  }
  
  loadPassengerFlowData(): void {
    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      this.generateMockFlowData();
      this.calculateStatistics();
      this.isLoading = false;
    }, 800);
  }
  
  loadTerminalFlows(): void {
    this.terminalFlows = this.generateMockTerminalFlows();
  }
  
  private generateMockFlowData(): void {
    const now = new Date();
    const byTerminal = this.terminals.map(terminal => {
      const passengerCount = Math.floor(Math.random() * 1000) + 500;
      const capacity = 2000 + Math.floor(Math.random() * 1000);
      return {
        terminal,
        passengerCount,
        capacity,
        utilization: (passengerCount / capacity) * 100
      };
    });
    
    const byArea = this.mockAreas.map(area => {
      const base = area.basePassengers;
      const variation = Math.sin(now.getHours() * 0.26) * 100; // Simulate daily pattern
      const passengerCount = Math.max(0, base + variation + Math.random() * 50);
      const queueLength = Math.floor(passengerCount * 0.3);
      const averageWaitTime = Math.floor(queueLength * 0.5 + Math.random() * 10);
      
      return {
        area: area.area,
        passengerCount: Math.floor(passengerCount),
        capacity: area.capacity,
        queueLength,
        averageWaitTime
      };
    });
    
    // Generate peak hours data (simulating daily pattern)
    const peakHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      passengerCount: Math.floor(
        500 + 
        800 * Math.sin((hour - 7) * Math.PI / 12) + // Morning peak
        600 * Math.sin((hour - 17) * Math.PI / 12) + // Evening peak
        Math.random() * 200
      )
    }));
    
    // Generate alerts
    const alerts: PassengerFlowAlert[] = [];
    if (Math.random() > 0.7) {
      alerts.push({
        id: 'ALERT001',
        area: 'SECURITY',
        type: 'HIGH_CONGESTION',
        severity: 'HIGH',
        message: 'High congestion at security checkpoint 3. Wait times exceeding 30 minutes.',
        timestamp: new Date(now.getTime() - 15 * 60000),
        resolved: false
      });
    }
    
    if (Math.random() > 0.8) {
      alerts.push({
        id: 'ALERT002',
        area: 'BAGGAGE_CLAIM',
        type: 'LONG_WAIT',
        severity: 'MEDIUM',
        message: 'Baggage claim area 4 experiencing delays due to high volume.',
        timestamp: new Date(now.getTime() - 30 * 60000),
        resolved: false
      });
    }
    
    this.flowData = {
      timestamp: now,
      totalPassengers: byTerminal.reduce((sum, t) => sum + t.passengerCount, 0),
      activePassengers: byArea.reduce((sum, a) => sum + a.passengerCount, 0),
      byTerminal,
      byArea,
      peakHours,
      alerts
    };
    
    // Update heatmap data
    this.updateHeatmapData();
  }

  getTerminalFlowDetail(): TerminalFlow | undefined {
    return this.terminalFlows.find(t => t.terminal === this.selectedTerminalDetail);
  }

  getFlowDataForArea(area: string): any {
    return this.flowData?.byArea.find(a => a.area === area);
  }

  private generateMockTerminalFlows(): TerminalFlow[] {
    return this.terminals.map(terminal => ({
      terminal,
      checkIn: {
        queues: Math.floor(Math.random() * 5) + 1,
        averageWait: Math.floor(Math.random() * 25) + 5,
        utilization: Math.random() * 100
      },
      security: {
        queues: Math.floor(Math.random() * 3) + 1,
        averageWait: Math.floor(Math.random() * 35) + 10,
        utilization: Math.random() * 100
      },
      immigration: {
        queues: Math.floor(Math.random() * 4) + 1,
        averageWait: Math.floor(Math.random() * 40) + 15,
        utilization: Math.random() * 100
      },
      baggage: {
        waitTime: Math.floor(Math.random() * 20) + 5,
        utilization: Math.random() * 100
      }
    }));
  }
  
  calculateStatistics(): void {
    if (!this.flowData) return;
    
    const { byArea, byTerminal, alerts } = this.flowData;
    
    const totalPassengers = byTerminal.reduce((sum, t) => sum + t.passengerCount, 0);
    const totalCapacity = byTerminal.reduce((sum, t) => sum + t.capacity, 0);
    const waitTimes = byArea.map(a => a.averageWaitTime);
    
    this.stats = {
      totalPassengers,
      peakHourPassengers: Math.max(...this.flowData.peakHours.map(p => p.passengerCount)),
      averageWaitTime: waitTimes.length > 0 ? 
        waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length : 0,
      maxWaitTime: waitTimes.length > 0 ? Math.max(...waitTimes) : 0,
      capacityUtilization: totalCapacity > 0 ? (totalPassengers / totalCapacity) * 100 : 0,
      alertsCount: alerts.length
    };
  }
  
  startRealTimeUpdates(): void {
    this.realTimeSubscription = interval(10000).subscribe(() => {
      if (this.autoRefresh && !this.isLoading) {
        this.updateRealTimeData();
      }
    });
  }
  
  startChartUpdates(): void {
    this.chartUpdateSubscription = interval(5000).subscribe(() => {
      if (this.showHeatmap) {
        this.updateHeatmap();
      }
    });
  }
  
  updateRealTimeData(): void {
    // Simulate real-time updates
    if (this.flowData) {
      this.flowData.timestamp = new Date();
      
      // Update area data with small random changes
      this.flowData.byArea = this.flowData.byArea.map(area => ({
        ...area,
        passengerCount: Math.max(0, area.passengerCount + (Math.random() - 0.5) * 20),
        queueLength: Math.floor(Math.random() * area.passengerCount * 0.35),
        averageWaitTime: Math.floor(area.averageWaitTime + (Math.random() - 0.5) * 2)
      }));
      
      // Update heatmap data
      this.updateHeatmapData();
      this.calculateStatistics();
    }
  }
  
  applyFilters(): void {
    // Filter logic would be implemented here
    this.calculateStatistics();
    
    if (this.showHeatmap) {
      this.updateHeatmap();
    }
  }
  
  onTerminalSelect(terminal: string): void {
    this.selectedTerminal = terminal;
    this.applyFilters();
  }
  
  onAreaSelect(area: string): void {
    this.selectedArea = area;
    this.applyFilters();
  }
  
  onTimeRangeChange(): void {
    this.loadPassengerFlowData();
  }
  
  toggleHeatmap(): void {
    this.showHeatmap = !this.showHeatmap;
    if (this.showHeatmap) {
      setTimeout(() => {
        this.initializeHeatmap();
        this.updateHeatmap();
      }, 100);
    }
  }
  
  toggleAlerts(): void {
    this.showAlerts = !this.showAlerts;
  }
  
  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startRealTimeUpdates();
    } else {
      this.realTimeSubscription?.unsubscribe();
    }
  }
  
  setViewMode(mode: 'OVERVIEW' | 'TERMINAL_DETAIL' | 'AREA_ANALYTICS'): void {
    this.viewMode = mode;
  }
  
  showTerminalDetail(terminal: string): void {
    this.selectedTerminalDetail = terminal;
    this.viewMode = 'TERMINAL_DETAIL';
  }
  
  showAreaDetail(area: string): void {
    this.selectedAreaDetail = area;
    this.viewMode = 'AREA_ANALYTICS';
  }
  
  navigateBack(): void {
    this.viewMode = 'OVERVIEW';
    this.selectedTerminalDetail = '';
    this.selectedAreaDetail = '';
  }
  
  acknowledgeAlert(alertId: string): void {
    if (this.flowData) {
      const alert = this.flowData.alerts.find(a => a.id === alertId);
      if (alert) {
        alert.resolved = true;
        this.calculateStatistics();
      }
    }
  }
  
  getAreaDisplayName(area: string): string {
    const names: Record<string, string> = {
      'CHECK_IN': 'Check-in',
      'SECURITY': 'Security',
      'IMMIGRATION': 'Immigration',
      'BAGGAGE_CLAIM': 'Baggage Claim',
      'RETAIL': 'Retail',
      'LOUNGES': 'Lounges',
      'GATES': 'Gates',
      'TRANSPORT': 'Transport'
    };
    return names[area] || area;
  }
  
  getAlertTypeDisplay(type: string): string {
    const types: Record<string, string> = {
      'HIGH_CONGESTION': 'High Congestion',
      'LONG_WAIT': 'Long Wait',
      'CAPACITY_EXCEEDED': 'Capacity Exceeded',
      'EQUIPMENT_ISSUE': 'Equipment Issue'
    };
    return types[type] || type;
  }
  
  getAlertSeverityClass(severity: string): string {
    const classes: Record<string, string> = {
      'LOW': 'alert-low',
      'MEDIUM': 'alert-medium',
      'HIGH': 'alert-high',
      'CRITICAL': 'alert-critical'
    };
    return classes[severity] || '';
  }
  
  getUtilizationClass(utilization: number): string {
    if (utilization >= 90) return 'utilization-critical';
    if (utilization >= 75) return 'utilization-high';
    if (utilization >= 50) return 'utilization-medium';
    return 'utilization-low';
  }
  
  getWaitTimeClass(waitTime: number): string {
    if (waitTime >= 30) return 'wait-critical';
    if (waitTime >= 20) return 'wait-high';
    if (waitTime >= 10) return 'wait-medium';
    return 'wait-low';
  }
  
  // Heatmap functionality
  private initializeHeatmap(): void {
    if (this.heatmapCanvas) {
      const canvas = this.heatmapCanvas.nativeElement;
      this.heatmapContext = canvas.getContext('2d');
      canvas.width = 800;
      canvas.height = 500;
    }
  }
  
  private updateHeatmapData(): void {
    if (!this.flowData) return;
    
    this.heatmapData = this.flowData.byArea.map(area => ({
      x: Math.random() * 700 + 50,
      y: Math.random() * 400 + 50,
      intensity: area.passengerCount / area.capacity,
      area: area.area,
      count: area.passengerCount
    }));
  }
  
  private updateHeatmap(): void {
    if (!this.heatmapContext || !this.heatmapData.length) return;
    
    const ctx = this.heatmapContext;
    const canvas = this.heatmapCanvas.nativeElement;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw airport layout background
    this.drawAirportLayout(ctx);
    
    // Draw heatmap points
    this.heatmapData.forEach(point => {
      this.drawHeatPoint(ctx, point.x, point.y, point.intensity, point.area);
    });
    
    // Draw legend
    this.drawHeatmapLegend(ctx);
  }
  
  private drawAirportLayout(ctx: CanvasRenderingContext2D): void {
    // Draw terminal areas
    ctx.fillStyle = 'rgba(240, 240, 240, 0.3)';
    ctx.fillRect(50, 50, 300, 400); // Terminal 1-3
    ctx.fillRect(400, 50, 350, 200); // Terminal 4-5
    
    // Draw area labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.fillText('Terminals 1-3', 180, 40);
    ctx.fillText('Terminals 4-5', 550, 40);
    
    // Draw corridors
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(350, 150);
    ctx.lineTo(400, 150);
    ctx.stroke();
  }
  
  private drawHeatPoint(
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    intensity: number, 
    area: string
  ): void {
    // Determine color based on intensity
    let color: string;
    if (intensity > 0.8) color = 'rgba(255, 0, 0, 0.7)';
    else if (intensity > 0.6) color = 'rgba(255, 165, 0, 0.7)';
    else if (intensity > 0.4) color = 'rgba(255, 255, 0, 0.7)';
    else if (intensity > 0.2) color = 'rgba(0, 255, 0, 0.7)';
    else color = 'rgba(0, 0, 255, 0.7)';
    
    // Draw heat point
    const radius = 15 + intensity * 25;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw area label
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(this.getAreaDisplayName(area), x, y - radius - 5);
  }
  
  private drawHeatmapLegend(ctx: CanvasRenderingContext2D): void {
    const legendX = 650;
    const legendY = 300;
    
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Passenger Density', legendX, legendY - 20);
    
    const intensities = [
      { label: 'Very High', color: 'rgba(255, 0, 0, 0.7)' },
      { label: 'High', color: 'rgba(255, 165, 0, 0.7)' },
      { label: 'Medium', color: 'rgba(255, 255, 0, 0.7)' },
      { label: 'Low', color: 'rgba(0, 255, 0, 0.7)' },
      { label: 'Very Low', color: 'rgba(0, 0, 255, 0.7)' }
    ];
    
    intensities.forEach((item, index) => {
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, legendY + (index * 25), 20, 15);
      ctx.fillStyle = '#333';
      ctx.fillText(item.label, legendX + 30, legendY + (index * 25) + 12);
    });
  }
  
  cleanupSubscriptions(): void {
    this.dataSubscription?.unsubscribe();
    this.realTimeSubscription?.unsubscribe();
    this.searchSubscription?.unsubscribe();
    this.chartUpdateSubscription?.unsubscribe();
  }
  
  refreshData(): void {
    this.isLoading = true;
    this.loadPassengerFlowData();
    this.loadTerminalFlows();
  }
  
  exportData(): void {
    // Implement export functionality
    console.log('Exporting passenger flow data...');
  }
}
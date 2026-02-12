import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

// Analytics data interfaces
export interface AirportMetric {
  name: string;
  value: number;
  change: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
}

export interface PassengerFlow {
  terminal: string;
  current: number;
  capacity: number;
  trend: number[];
}

export interface WeatherData {
  temperature: number;
  condition: 'clear' | 'cloudy' | 'rain' | 'fog';
  windSpeed: number;
  visibility: number;
}

export interface Alert {
  id: number;
  type: 'warning' | 'info' | 'success';
  message: string;
  time: string;
}

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.html',
  standalone: false,
  styleUrls: ['./analytics.scss']
})
export class Analytics implements OnInit, AfterViewInit, OnDestroy {
  // ViewChild references for canvas elements
  @ViewChild('flightChartCanvas') flightChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('passengerChartCanvas') passengerChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('resourceChartCanvas') resourceChartCanvas!: ElementRef<HTMLCanvasElement>;
  
  // Time period options
  timePeriods = ['Real-time', 'Today', 'Week', 'Month', 'Quarter'];
  selectedPeriod = 'Today';
  
  // KPI Metrics
  airportMetrics: AirportMetric[] = [
    { name: 'Total Flights', value: 342, change: 12.5, unit: '', trend: 'up' },
    { name: 'On-Time Performance', value: 86.4, change: 2.1, unit: '%', trend: 'up' },
    { name: 'Passenger Volume', value: 45820, change: 8.7, unit: '', trend: 'up' },
    { name: 'Baggage Handling', value: 99.2, change: 0.3, unit: '%', trend: 'stable' },
    { name: 'Security Wait Time', value: 8.5, change: -1.2, unit: 'min', trend: 'down' },
    { name: 'Carbon Emissions', value: 1245, change: -3.4, unit: 'tons', trend: 'down' }
  ];
  
  // Flight operations data
  flightOperations = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    arrivals: [12, 8, 25, 32, 28, 18],
    departures: [10, 6, 28, 30, 26, 15],
    delays: [2, 1, 4, 3, 5, 2]
  };
  
  // Passenger flow by terminal
  passengerFlow: PassengerFlow[] = [
    { terminal: 'Terminal A', current: 12500, capacity: 18000, trend: [11000, 11500, 12000, 12500] },
    { terminal: 'Terminal B', current: 9800, capacity: 15000, trend: [9000, 9200, 9500, 9800] },
    { terminal: 'Terminal C', current: 15200, capacity: 20000, trend: [14000, 14500, 14800, 15200] },
    { terminal: 'International', current: 8320, capacity: 12000, trend: [7800, 8000, 8200, 8320] }
  ];
  
  // Resource utilization
  resourceUtilization = {
    labels: ['Gates', 'Check-in', 'Security', 'Baggage', 'Parking', 'Retail'],
    utilization: [85, 72, 68, 90, 78, 65]
  };
  
  // Weather data
  weather: WeatherData = {
    temperature: 22,
    condition: 'clear',
    windSpeed: 12,
    visibility: 10
  };
  
  // Charts references
  private flightChart: Chart | null = null;
  private passengerChart: Chart | null = null;
  private resourceChart: Chart | null = null;
  
  // Chart initialization flags
  private chartsInitialized = false;
  private retryCount = 0;
  private maxRetries = 5;
  
  // Alert notifications
  alerts: Alert[] = [
    { id: 1, type: 'warning', message: 'Security queue at Terminal B exceeding 15 minutes', time: '10:25' },
    { id: 2, type: 'info', message: 'Baggage system maintenance scheduled for 02:00-04:00', time: '09:45' },
    { id: 3, type: 'success', message: 'All flights currently operating on schedule', time: '08:30' }
  ];
  
  // Filter options
  filterOptions = {
    terminal: 'All',
    airline: 'All',
    flightType: 'All'
  };
  
  // Simulated real-time updates
  private updateInterval: any;
  
  // Math reference for template
  Math = Math;
  
  constructor() {}
  
  ngOnInit(): void {}
  
  ngAfterViewInit(): void {
    // Wait for view to stabilize, then initialize charts
    setTimeout(() => {
      this.initializeCharts();
      this.startRealTimeUpdates();
    }, 500);
  }
  
  ngOnDestroy(): void {
    // Clear interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    // Destroy charts
    this.destroyCharts();
  }
  
  // Helper methods for template calculations
  getPassengerCapacityPercentage(): string {
    const totalCurrent = this.passengerFlow.reduce((sum, p) => sum + p.current, 0);
    const totalCapacity = this.passengerFlow.reduce((sum, p) => sum + p.capacity, 0);
    const percentage = (totalCurrent / totalCapacity) * 100;
    return percentage.toFixed(1);
  }
  
  getOnTimePerformance(): number {
    const performanceMetric = this.airportMetrics.find(metric => metric.name === 'On-Time Performance');
    return performanceMetric ? performanceMetric.value : 0;
  }
  
  getTotalFlights(): number {
    const flightsMetric = this.airportMetrics.find(metric => metric.name === 'Total Flights');
    return flightsMetric ? flightsMetric.value : 0;
  }
  
  getSecurityTrend(): number {
    const securityMetric = this.airportMetrics.find(metric => metric.name === 'Security Wait Time');
    return securityMetric ? securityMetric.change : 0;
  }
  
  getSecurityTrendText(): string {
    const trend = this.getSecurityTrend();
    return trend > 0 ? 'increased' : trend < 0 ? 'decreased' : 'remained stable';
  }
  
  getAbsoluteSecurityChange(): number {
    return Math.abs(this.getSecurityTrend());
  }
  
  private areCanvasesAvailable(): boolean {
    return !!(
      this.flightChartCanvas?.nativeElement &&
      this.passengerChartCanvas?.nativeElement &&
      this.resourceChartCanvas?.nativeElement
    );
  }
  
  private setCanvasDimensions(canvas: HTMLCanvasElement): void {
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight || 300;
    } else {
      canvas.width = 400;
      canvas.height = 300;
    }
  }
  
  initializeCharts(): void {
    // Check if canvases are available
    if (!this.areCanvasesAvailable()) {
      console.warn('Canvas elements not available, retrying...');
      
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => this.initializeCharts(), 300 * this.retryCount);
      }
      return;
    }
    
    this.retryCount = 0;
    
    try {
      // Destroy existing charts
      this.destroyCharts();
      
      // Initialize each chart
      this.initFlightChart();
      this.initPassengerChart();
      this.initResourceChart();
      
      this.chartsInitialized = true;
      console.log('Charts initialized successfully');
      
    } catch (error) {
      console.error('Error initializing charts:', error);
      
      // Retry on error
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        setTimeout(() => this.initializeCharts(), 500 * this.retryCount);
      }
    }
  }
  
  private initFlightChart(): void {
    const canvas = this.flightChartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get 2D context for flight chart');
    }
    
    // Set canvas dimensions
    this.setCanvasDimensions(canvas);
    
    // Create chart
    this.flightChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.flightOperations.labels,
        datasets: [
          {
            label: 'Arrivals',
            data: this.flightOperations.arrivals,
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#4CAF50',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#4CAF50'
          },
          {
            label: 'Departures',
            data: this.flightOperations.departures,
            borderColor: '#2196F3',
            backgroundColor: 'rgba(33, 150, 243, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#2196F3',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#2196F3'
          },
          {
            label: 'Delays',
            data: this.flightOperations.delays,
            borderColor: '#FF9800',
            backgroundColor: 'rgba(255, 152, 0, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#FF9800',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: '#FF9800'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              stepSize: 10
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  private initPassengerChart(): void {
    const canvas = this.passengerChartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get 2D context for passenger chart');
    }
    
    // Set canvas dimensions
    this.setCanvasDimensions(canvas);
    
    // Create chart
    this.passengerChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.passengerFlow.map(p => p.terminal),
        datasets: [
          {
            label: 'Current Passengers',
            data: this.passengerFlow.map(p => p.current),
            backgroundColor: 'rgba(33, 150, 243, 0.7)',
            borderColor: '#2196F3',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.6,
            categoryPercentage: 0.8
          },
          {
            label: 'Capacity',
            data: this.passengerFlow.map(p => p.capacity),
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            borderColor: '#FF6384',
            borderWidth: 2,
            type: 'line',
            fill: false,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#FF6384',
            pointBorderColor: '#fff'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)',
            },
            ticks: {
              callback: function(value) {
                return value.toLocaleString();
              }
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  private initResourceChart(): void {
    const canvas = this.resourceChartCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Could not get 2D context for resource chart');
    }
    
    // Set canvas dimensions
    this.setCanvasDimensions(canvas);
    
    // Create chart
    this.resourceChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: this.resourceUtilization.labels,
        datasets: [{
          label: 'Utilization %',
          data: this.resourceUtilization.utilization,
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          borderColor: '#FF9800',
          pointBackgroundColor: '#FF9800',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#FF9800',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          r: {
            angleLines: {
              display: true,
              color: 'rgba(0, 0, 0, 0.05)'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            suggestedMin: 0,
            suggestedMax: 100,
            beginAtZero: true,
            ticks: {
              stepSize: 20,
              callback: function(value) {
                return value + '%';
              }
            }
          }
        }
      }
    });
  }
  
  private destroyCharts(): void {
    if (this.flightChart) {
      this.flightChart.destroy();
      this.flightChart = null;
    }
    if (this.passengerChart) {
      this.passengerChart.destroy();
      this.passengerChart = null;
    }
    if (this.resourceChart) {
      this.resourceChart.destroy();
      this.resourceChart = null;
    }
  }
  
  startRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(() => {
      if (this.selectedPeriod === 'Real-time' && this.chartsInitialized) {
        this.updateRealTimeData();
      }
    }, 5000);
  }
  
  updateRealTimeData(): void {
    try {
      // Simulate real-time data updates
      this.airportMetrics.forEach(metric => {
        const change = (Math.random() * 2 - 1) * 0.5;
        metric.value = parseFloat((metric.value + change).toFixed(1));
      });
      
      // Update flight operations data
      const lastIndex = this.flightOperations.arrivals.length - 1;
      this.flightOperations.arrivals[lastIndex] = Math.max(0, 
        this.flightOperations.arrivals[lastIndex] + Math.floor(Math.random() * 3) - 1
      );
      this.flightOperations.departures[lastIndex] = Math.max(0,
        this.flightOperations.departures[lastIndex] + Math.floor(Math.random() * 3) - 1
      );
      this.flightOperations.delays[lastIndex] = Math.max(0,
        this.flightOperations.delays[lastIndex] + Math.floor(Math.random() * 2)
      );
      
      // Update passenger flow
      this.passengerFlow.forEach(terminal => {
        const change = (Math.random() * 200 - 100);
        terminal.current = Math.max(0, Math.min(terminal.capacity, terminal.current + change));
      });
      
      // Update resource utilization
      this.resourceUtilization.utilization = this.resourceUtilization.utilization.map(val => 
        Math.min(100, Math.max(0, val + (Math.random() * 4 - 2)))
      );
      
      // Update charts
      this.updateCharts();
      
    } catch (error) {
      console.error('Error updating real-time data:', error);
    }
  }
  
  updateCharts(): void {
    if (this.flightChart) {
      this.flightChart.data.datasets[0].data = this.flightOperations.arrivals;
      this.flightChart.data.datasets[1].data = this.flightOperations.departures;
      this.flightChart.data.datasets[2].data = this.flightOperations.delays;
      this.flightChart.update();
    }
    
    if (this.passengerChart) {
      this.passengerChart.data.datasets[0].data = this.passengerFlow.map(p => p.current);
      this.passengerChart.data.datasets[1].data = this.passengerFlow.map(p => p.capacity);
      this.passengerChart.update();
    }
    
    if (this.resourceChart) {
      this.resourceChart.data.datasets[0].data = this.resourceUtilization.utilization;
      this.resourceChart.update();
    }
  }
  
  onTimePeriodChange(period: string): void {
    this.selectedPeriod = period;
    
    // Simulate data change based on period
    if (period === 'Today') {
      this.flightOperations.arrivals = [12, 8, 25, 32, 28, 18];
      this.flightOperations.departures = [10, 6, 28, 30, 26, 15];
      this.flightOperations.delays = [2, 1, 4, 3, 5, 2];
    } else if (period === 'Week') {
      this.flightOperations.arrivals = [84, 56, 175, 224, 196, 126];
      this.flightOperations.departures = [70, 42, 196, 210, 182, 105];
      this.flightOperations.delays = [14, 7, 28, 21, 35, 14];
    } else if (period === 'Month') {
      this.flightOperations.arrivals = [360, 240, 750, 960, 840, 540];
      this.flightOperations.departures = [300, 180, 840, 900, 780, 450];
      this.flightOperations.delays = [60, 30, 120, 90, 150, 60];
    }
    
    this.updateCharts();
    console.log(`Time period changed to: ${period}`);
  }
  
  onFilterChange(): void {
    console.log('Filters updated:', this.filterOptions);
  }
  
  exportData(): void {
    console.log('Exporting analytics data...');
    
    // Prepare data for export
    const exportData = {
      timestamp: new Date().toISOString(),
      period: this.selectedPeriod,
      metrics: this.airportMetrics,
      flightOperations: this.flightOperations,
      passengerFlow: this.passengerFlow,
      resourceUtilization: this.resourceUtilization
    };
    
    // Create JSON file and download
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `airport-analytics-${new Date().getTime()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    console.log('Export completed');
  }
  
  getWeatherIcon(condition: string): string {
    switch(condition) {
      case 'clear': return 'wb_sunny';
      case 'cloudy': return 'cloud';
      case 'rain': return 'umbrella';
      case 'fog': return 'cloud_queue';
      default: return 'help_outline';
    }
  }
  
  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    switch(trend) {
      case 'up': return 'trending_up';
      case 'down': return 'trending_down';
      case 'stable': return 'trending_flat';
      default: return 'remove';
    }
  }
  
  getTrendColor(trend: 'up' | 'down' | 'stable'): string {
    switch(trend) {
      case 'up': return 'primary';
      case 'down': return 'warn';
      case 'stable': return 'accent';
      default: return '';
    }
  }
  
  refreshCharts(): void {
    this.destroyCharts();
    setTimeout(() => {
      this.initializeCharts();
    }, 100);
  }
}
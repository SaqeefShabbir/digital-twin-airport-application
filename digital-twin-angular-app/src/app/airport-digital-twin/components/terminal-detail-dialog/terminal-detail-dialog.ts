import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Chart, ChartConfiguration } from 'chart.js';
import { TerminalStatus } from '../../models/airport-models';

export interface TerminalDetailDialogData {
  terminal: TerminalStatus;
  editMode?: boolean;
}

@Component({
  selector: 'app-terminal-detail-dialog',
  templateUrl: './terminal-detail-dialog.html',
  standalone: false,
  styleUrls: ['./terminal-detail-dialog.scss']
})
export class TerminalDetailDialog implements OnInit {
  terminalForm: FormGroup;
  editMode = false;
  isLoading = false;
  
  // Charts
  passengerFlowChart: Chart | null = null;
  waitTimeChart: Chart | null = null;
  occupancyChart: Chart | null = null;
  
  // Analytics data
  analytics = {
    hourlyPassengers: [
      { hour: '00:00', passengers: 120 },
      { hour: '02:00', passengers: 80 },
      { hour: '04:00', passengers: 150 },
      { hour: '06:00', passengers: 450 },
      { hour: '08:00', passengers: 1250 },
      { hour: '10:00', passengers: 1850 },
      { hour: '12:00', passengers: 2100 },
      { hour: '14:00', passengers: 1950 },
      { hour: '16:00', passengers: 2300 },
      { hour: '18:00', passengers: 2800 },
      { hour: '20:00', passengers: 1800 },
      { hour: '22:00', passengers: 950 }
    ],
    waitTimeTrend: [
      { time: '6 AM', security: 8, baggage: 5 },
      { time: '8 AM', security: 15, baggage: 8 },
      { time: '10 AM', security: 22, baggage: 12 },
      { time: '12 PM', security: 25, baggage: 15 },
      { time: '2 PM', security: 18, baggage: 10 },
      { time: '4 PM', security: 20, baggage: 12 },
      { time: '6 PM', security: 16, baggage: 9 },
      { time: '8 PM', security: 12, baggage: 7 }
    ],
    occupancyByArea: [
      { area: 'Check-in', occupancy: 65 },
      { area: 'Security', occupancy: 85 },
      { area: 'Food Court', occupancy: 45 },
      { area: 'Gates', occupancy: 70 },
      { area: 'Baggage Claim', occupancy: 40 }
    ]
  };
  
  // Facilities
  facilities = [
    { name: 'Security Checkpoints', count: 8, status: 'normal' },
    { name: 'Baggage Carousels', count: 6, status: 'warning' },
    { name: 'Check-in Counters', count: 24, status: 'normal' },
    { name: 'Gates', count: 18, status: 'normal' },
    { name: 'Restaurants', count: 12, status: 'normal' },
    { name: 'Restrooms', count: 16, status: 'maintenance' },
    { name: 'Retail Stores', count: 20, status: 'normal' },
    { name: 'Lounges', count: 3, status: 'normal' }
  ];
  
  // Recent alerts
  recentAlerts = [
    { time: '10:30 AM', type: 'Security', message: 'Queue length exceeds 30 minutes', priority: 'high' },
    { time: '09:45 AM', type: 'Baggage', message: 'Carousel B3 delayed', priority: 'medium' },
    { time: '08:15 AM', type: 'Facility', message: 'Restroom maintenance in progress', priority: 'low' }
  ];
  
  // Staff information
  staffInfo = {
    total: 185,
    byDepartment: [
      { department: 'Security', count: 45, required: 50 },
      { department: 'Check-in', count: 32, required: 35 },
      { department: 'Baggage', count: 28, required: 30 },
      { department: 'Cleaning', count: 40, required: 40 },
      { department: 'Retail', count: 40, required: 40 }
    ]
  };

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TerminalDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TerminalDetailDialogData
  ) {
    this.editMode = data.editMode || false;
    
    this.terminalForm = this.fb.group({
      terminal: [data.terminal.terminal, Validators.required],
      passengerCount: [data.terminal.passengerCount, [Validators.required, Validators.min(0)]],
      securityWaitTime: [data.terminal.securityWaitTime, [Validators.required, Validators.min(0)]],
      checkinWaitTime: [data.terminal.checkinWaitTime || 0, [Validators.min(0)]],
      baggageWaitTime: [data.terminal.baggageWaitTime, [Validators.required, Validators.min(0)]],
      crowdedness: [data.terminal.crowdedness, Validators.required],
      capacity: [5000, [Validators.required, Validators.min(100)]],
      operatingHours: ['05:00 - 01:00'],
      notes: ['']
    });
    
    if (!this.editMode) {
      this.terminalForm.disable();
    }
  }

  ngOnInit(): void {
    this.initCharts();
  }

  initCharts(): void {
    this.createPassengerFlowChart();
    this.createWaitTimeChart();
    this.createOccupancyChart();
  }

  createPassengerFlowChart(): void {
    const canvas = document.getElementById('passengerFlowChart') as HTMLCanvasElement;
    if (!canvas) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: this.analytics.hourlyPassengers.map(h => h.hour),
        datasets: [{
          label: 'Passenger Count',
          data: this.analytics.hourlyPassengers.map(h => h.passengers),
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: 'white'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          }
        }
      }
    };

    this.passengerFlowChart = new Chart(canvas, config);
  }

  createWaitTimeChart(): void {
    const canvas = document.getElementById('waitTimeChart') as HTMLCanvasElement;
    if (!canvas) return;

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: this.analytics.waitTimeTrend.map(w => w.time),
        datasets: [
          {
            label: 'Security Wait',
            data: this.analytics.waitTimeTrend.map(w => w.security),
            backgroundColor: 'rgba(231, 76, 60, 0.7)',
            borderColor: '#e74c3c',
            borderWidth: 1
          },
          {
            label: 'Baggage Wait',
            data: this.analytics.waitTimeTrend.map(w => w.baggage),
            backgroundColor: 'rgba(243, 156, 18, 0.7)',
            borderColor: '#f39c12',
            borderWidth: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: 'white'
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            },
            ticks: {
              color: 'rgba(255, 255, 255, 0.7)'
            }
          }
        }
      }
    };

    this.waitTimeChart = new Chart(canvas, config);
  }

  createOccupancyChart(): void {
    const canvas = document.getElementById('occupancyChart') as HTMLCanvasElement;
    if (!canvas) return;

    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: this.analytics.occupancyByArea.map(o => o.area),
        datasets: [{
          data: this.analytics.occupancyByArea.map(o => o.occupancy),
          backgroundColor: [
            'rgba(52, 152, 219, 0.8)',
            'rgba(46, 204, 113, 0.8)',
            'rgba(155, 89, 182, 0.8)',
            'rgba(241, 196, 15, 0.8)',
            'rgba(230, 126, 34, 0.8)'
          ],
          borderColor: [
            '#3498db',
            '#2ecc71',
            '#9b59b6',
            '#f1c40f',
            '#e67e22'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: 'white',
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.label}: ${context.raw}%`;
              }
            }
          }
        }
      }
    };

    this.occupancyChart = new Chart(canvas, config);
  }

  getOccupancyPercentage(): number {
    const capacity = this.terminalForm.get('capacity')?.value || 5000;
    const passengers = this.terminalForm.get('passengerCount')?.value || 0;
    return Math.min(100, Math.round((passengers / capacity) * 100));
  }

  getWaitTimeStatus(waitTime: number, type: 'security' | 'baggage'): string {
    if (type === 'security') {
      if (waitTime < 10) return 'Low';
      if (waitTime < 20) return 'Medium';
      return 'High';
    } else {
      if (waitTime < 5) return 'Low';
      if (waitTime < 10) return 'Medium';
      return 'High';
    }
  }

  getWaitTimeColor(waitTime: number, type: 'security' | 'baggage'): string {
    if (type === 'security') {
      if (waitTime < 10) return '#2ecc71';
      if (waitTime < 20) return '#f39c12';
      return '#e74c3c';
    } else {
      if (waitTime < 5) return '#2ecc71';
      if (waitTime < 10) return '#f39c12';
      return '#e74c3c';
    }
  }

  getCrowdednessColor(crowdedness: string): string {
    switch(crowdedness.toLowerCase()) {
      case 'low': return '#2ecc71';
      case 'medium': return '#f39c12';
      case 'high': return '#e74c3c';
      case 'critical': return '#c0392b';
      default: return '#95a5a6';
    }
  }

  getStaffCoverage(dept: any): number {
    return Math.round((dept.count / dept.required) * 100);
  }

  getStaffCoverageColor(dept: any): string {
    const coverage = this.getStaffCoverage(dept);
    if (coverage >= 100) return '#2ecc71';
    if (coverage >= 80) return '#f39c12';
    return '#e74c3c';
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    if (this.editMode) {
      this.terminalForm.enable();
    } else {
      this.terminalForm.disable();
    }
  }

  saveTerminal(): void {
    if (this.terminalForm.valid) {
      this.isLoading = true;
      
      // Simulate API call
      setTimeout(() => {
        const updatedTerminal = {
          ...this.data.terminal,
          ...this.terminalForm.value
        };
        
        this.dialogRef.close({
          saved: true,
          terminal: updatedTerminal,
          refresh: true
        });
        
        this.isLoading = false;
      }, 1000);
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  exportTerminalReport(): void {
    const report = {
      terminal: this.data.terminal,
      analytics: this.analytics,
      facilities: this.facilities,
      staff: this.staffInfo,
      timestamp: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(report, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `${this.data.terminal.terminal.replace(/\s+/g, '-').toLowerCase()}-report-${new Date().toISOString().split('T')[0]}.json`);
    link.click();
  }

  ngOnDestroy(): void {
    if (this.passengerFlowChart) {
      this.passengerFlowChart.destroy();
    }
    if (this.waitTimeChart) {
      this.waitTimeChart.destroy();
    }
    if (this.occupancyChart) {
      this.occupancyChart.destroy();
    }
  }
}
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Alert, AlertPriority } from '../../models/airport-models';

export interface AlertDialogData {
  alert?: Alert;
  mode: 'view' | 'create' | 'edit';
}

@Component({
  selector: 'app-alert-dialog',
  templateUrl: './alert-dialog.html',
  standalone: false,
  styleUrls: ['./alert-dialog.scss']
})
export class AlertDialog implements OnInit {
  alertForm: FormGroup;
  isEditMode = false;
  isCreateMode = false;
  priorities = [
    { value: 1, label: 'Critical', color: '#e74c3c', icon: 'error' },
    { value: 2, label: 'Warning', color: '#f39c12', icon: 'warning' },
    { value: 3, label: 'Info', color: '#3498db', icon: 'info' },
    { value: 4, label: 'Low', color: '#95a5a6', icon: 'notifications' }
  ];

  alertTypes = [
    { value: 'security', label: 'Security', icon: 'security' },
    { value: 'flight', label: 'Flight Operations', icon: 'flight' },
    { value: 'gate', label: 'Gate Management', icon: 'gate' },
    { value: 'terminal', label: 'Terminal Operations', icon: 'business' },
    { value: 'baggage', label: 'Baggage System', icon: 'luggage' },
    { value: 'security_wait', label: 'Security Wait Time', icon: 'timer' },
    { value: 'weather', label: 'Weather Impact', icon: 'cloud' },
    { value: 'equipment', label: 'Equipment Failure', icon: 'build' },
    { value: 'staffing', label: 'Staffing Issue', icon: 'people' },
    { value: 'system', label: 'System Alert', icon: 'computer' }
  ];

  terminalLocations = [
    'All Terminals',
    'Terminal 1',
    'Terminal 2', 
    'Terminal 3',
    'Terminal 4',
    'Main Terminal',
    'Security Area',
    'Baggage Claim',
    'Check-in Area',
    'Gates Area',
    'Runway',
    'Control Tower'
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AlertDialog>,
    @Inject(MAT_DIALOG_DATA) public data: AlertDialogData
  ) {
    this.isEditMode = data.mode === 'edit';
    this.isCreateMode = data.mode === 'create';
    
    this.alertForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(500)]],
      type: ['', Validators.required],
      priority: [2, Validators.required],
      location: ['', Validators.required],
      terminal: [''],
      estimatedResolutionTime: [30],
      assignedTo: [''],
      requiresAcknowledgement: [true],
      sendNotification: [true],
      autoEscalate: [false]
    });
  }

  ngOnInit(): void {
    if (this.data.alert) {
      this.alertForm.patchValue({
        title: this.data.alert.title,
        description: this.data.alert.description,
        type: this.data.alert.type,
        priority: this.data.alert.priority,
        location: this.data.alert.location,
        terminal: this.data.alert.terminal || '',
        estimatedResolutionTime: this.data.alert.estimatedResolutionTime || 30,
        assignedTo: this.data.alert.assignedTo || '',
        requiresAcknowledgement: this.data.alert.requiresAcknowledgement !== false,
        sendNotification: true,
        autoEscalate: this.data.alert.autoEscalate || false
      });

      if (this.data.mode === 'view') {
        this.alertForm.disable();
      }
    }
  }

  getPriorityColor(priority: number): string {
    const priorityObj = this.priorities.find(p => p.value === priority);
    return priorityObj ? priorityObj.color : '#95a5a6';
  }

  getPriorityIcon(priority: number): string {
    const priorityObj = this.priorities.find(p => p.value === priority);
    return priorityObj ? priorityObj.icon : 'notifications';
  }

  getTypeIcon(type: string): string {
    const typeObj = this.alertTypes.find(t => t.value === type);
    return typeObj ? typeObj.icon : 'warning';
  }

  acknowledge(): void {
    this.dialogRef.close({ 
      acknowledged: true,
      alertId: this.data.alert?.id 
    });
  }

  resolve(): void {
    this.dialogRef.close({ 
      resolved: true,
      alertId: this.data.alert?.id 
    });
  }

  save(): void {
    if (this.alertForm.valid) {
      const formValue = this.alertForm.value;
      const alertData = {
        ...formValue,
        timestamp: this.isCreateMode ? new Date() : this.data.alert?.timestamp,
        acknowledged: false,
        resolved: false,
        id: this.isCreateMode ? `ALERT-${Date.now()}` : this.data.alert?.id
      };
      
      this.dialogRef.close({ 
        saved: true,
        alert: alertData 
      });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }

  getEstimatedResolutionTime(): string {
    const minutes = this.alertForm.get('estimatedResolutionTime')?.value || 30;
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const remaining = minutes % 60;
      return remaining > 0 ? `${hours}h ${remaining}m` : `${hours} hours`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} days`;
    }
  }

  getImpactLevel(): string {
    const priority = this.alertForm.get('priority')?.value;
    switch(priority) {
      case 1: return 'High - Immediate action required';
      case 2: return 'Medium - Action required within 30 minutes';
      case 3: return 'Low - Monitor situation';
      case 4: return 'Info - For awareness only';
      default: return 'Unknown';
    }
  }

  getFormattedTimestamp(): string {
    if (!this.data.alert?.timestamp) return 'N/A';
    
    const date = new Date(this.data.alert.timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    
    return date.toLocaleString();
  }
}
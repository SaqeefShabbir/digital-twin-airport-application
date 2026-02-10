import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertSystem } from './alert-system';

describe('AlertSystem', () => {
  let component: AlertSystem;
  let fixture: ComponentFixture<AlertSystem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AlertSystem]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AlertSystem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

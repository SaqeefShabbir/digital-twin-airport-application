import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ThreeDVisualization } from './three-d-visualization';

describe('ThreeDVisualization', () => {
  let component: ThreeDVisualization;
  let fixture: ComponentFixture<ThreeDVisualization>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ThreeDVisualization]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThreeDVisualization);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

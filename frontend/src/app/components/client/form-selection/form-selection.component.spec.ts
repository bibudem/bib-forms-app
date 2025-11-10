import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormSelectionComponent } from './form-selection.component';

describe('FormSelectionComponent', () => {
  let component: FormSelectionComponent;
  let fixture: ComponentFixture<FormSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormSelectionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

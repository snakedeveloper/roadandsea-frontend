import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DialogSimpleData } from 'src/app/templates/dialog/dialogSimpleData';

@Component({
  selector: 'app-dialog-simple',
  templateUrl: './dialog-simple.component.html',
  styleUrls: ['./dialog-simple.component.scss']
})
export class DialogSimpleComponent implements OnInit {

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogSimpleData) { }

  ngOnInit(): void {
  }

}

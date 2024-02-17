import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogSimpleComponent } from '../dialogs/dialog-simple/dialog-simple.component';
import { DialogSimpleData } from '../templates/dialog/dialogSimpleData';

@Injectable({
  providedIn: 'root'
})

/**
 * @title - Service to controll Dialog functions and data.
 */

export class DialogService {

  constructor(public dialog: MatDialog) { }
  /**
   * Function to open simple dialog with provided data
   * @param dialogTextData - String that will be shown as text on the midle
   * @param buttonData - String for Button that will be shown on the bottom. 
   * @param typeData - String that will define icon and icons color. Options: 'warning','neutral','positive'
   */
  openSimpleDialog(dialogTextData: String, buttonData: String, typeData: String): void {
    let topIconResult = ''
    let iconColorResult = ''
  
    switch (typeData) {
      case 'positive':
        topIconResult = 'check_circle'
        iconColorResult = 'positive'
        break;
      case 'neutral':
        topIconResult = 'info'
        iconColorResult = 'neutral'
        break;
      case 'warning':
        topIconResult = 'error'
        iconColorResult = 'warning'
        break;
      default:
        break;
    }
    const dialog_data: DialogSimpleData = {topIcon: topIconResult, iconColor: iconColorResult, dialogText: dialogTextData, button: buttonData, type: typeData,  }
    this.dialog.open(DialogSimpleComponent, {
      data: {
        topIcon: dialog_data.topIcon,
        iconColor: dialog_data.iconColor,
        dialogText: dialog_data.dialogText,
        button: dialog_data.button,
        type: dialog_data.type
      }
    });
  }
}

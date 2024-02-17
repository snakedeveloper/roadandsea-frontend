import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Router } from '@angular/router';
import { AuthUserReply, CheckUserReply, CreateSessionReply } from 'src/app/templates/auth/replies';
import { AuthUserRequest, CheckUserRequest, CreateSessionRequest } from 'src/app/templates/auth/requests';
import { Sql } from 'src/app/templates/data/sql';
import { User } from 'src/app/templates/data/user';
import { DataService } from '../data/data.service';
import { DialogService } from '../dialog.service';


@Injectable( {
  providedIn: 'root'
} )
export class LoginService {
  constructor(
    public afAuth: AngularFireAuth,
    public http: HttpClient,
    public router: Router,
    public dataService: DataService,
    public dialogService: DialogService,
  ) { }
  /**
   * Loginservice Variables
   */
  isOnLogin: boolean = true;
  emailSent: String = ''
  /**
   * Function to check if user exist in firebase database and spedtrans database and start sendLinkToEmail if exist.
   * @param email - string with email to log-in
   */
  async checkUser( email: string ) {
    if ( this.validateEmail( email ) ) {
      try {
        let check_user_request = {} as CheckUserRequest
        check_user_request.email = email
        const api_result = await this.http.post( `${this.dataService.apiAdres}/checkUser`, check_user_request ).toPromise() as CheckUserReply
        console.log( 'Response is: ', api_result );
        if ( api_result.result ) {
          this.sendLinkToEmail( email );
          this.emailSent = email
          this.changeToEmailSent()
          this.dialogService.openSimpleDialog(
            'Link do logowania został wysłany na podany adres Email.<br> Sprawdź skrzynkę pocztową.',
            'OK', 'positive'
          );
        } else {
          this.dialogService.openSimpleDialog( api_result.message, 'OK', 'warning' )
        }

      } catch ( error ) {
        this.dialogService.openSimpleDialog(
          'Nawiązanie połączenia z serwerem nie powiodło się. <br/> Proszę sprawdzić połączenie z internetem',
          'OK', 'warning'
        );
      }

    } else {
      this.dialogService.openSimpleDialog(
        'Niepoprawny adres Email. <br/> Sprawdź pisownie.',
        'OK', 'warning'
      )
    }


  }

  /**
   * Function to send authenticate link to e-mail adress
   * @param email - string with email to send link
   */
  async sendLinkToEmail( email: string ) {
    const actionCodeSetting = {
      url: 'https://tftlogistic.com/zlecenia/create-session',
      handleCodeInApp: true
    }
    try {
      await this.afAuth.sendSignInLinkToEmail(
        email,
        actionCodeSetting
      );
      localStorage.setItem( 'email', email );
    } catch ( error ) {
      window.alert( error )
    }
  }

  /**
   * Function to create tokenSession after link on the e-mail is clicked.
   * @param url -taken from the current router url
   */
  async createTokenSession( url: string ) {
    try {
      var userEmail = ( localStorage.getItem( 'email' ) || '' )
      console.log( 'user is: ', userEmail )
      if ( !userEmail ) {
        userEmail = window.prompt( 'Podaj swój adres e-mail' ) || ''
      }
      await this.afAuth.signInWithEmailLink( userEmail, url ).then( ( user ) => {
        var sessionRequest = {} as CreateSessionRequest;
        sessionRequest.email = userEmail;
        if ( user.user?.uid ) {
          sessionRequest.uid = user.user.uid;
        }
        this.http.post( `${this.dataService.apiAdres}/createSession`, sessionRequest ).subscribe( async ( response ) => {
          const session_reply = response as CreateSessionReply;
          console.log( 'sessionRelpy sid is: ', session_reply.sid )
          if ( session_reply ) {
            localStorage.setItem( 'sid', session_reply.sid );
            localStorage.setItem( 'id', session_reply.id.toString() );
            localStorage.setItem( 'idPrac', session_reply.idPrac.toString() );
            localStorage.setItem( 'uid', session_reply.uid.toString() );
            localStorage.setItem( 'firstName', session_reply.firstName );
            localStorage.setItem( 'lastName', session_reply.lastName );
            localStorage.setItem( 'email', session_reply.email );
            localStorage.setItem( 'isAdmin', String( session_reply.isAdmin ) );
            this.setUser().then( () => {
              this.dataService.navList[1].display = this.dataService.checkIfAdmin()
            } )
            this.router.navigate( ['orders'] )
          }
          else {
            this.router.navigate( ['login'] );
            alert( 'Błąd #00001' )
          }
        } );
      } )
    } catch ( error: any ) {
      let errorCode = error.code
      switch ( error.code ) {
        case "ERROR_EMAIL_ALREADY_IN_USE":
        case "account-exists-with-different-credential":
        case "email-already-in-use":
          errorCode = "Email jest już używany. Przejdź do strony logowania.";
          break;
        case "ERROR_USER_NOT_FOUND":
        case "user-not-found":
          errorCode = "Nie znaleziono użytkownika z tym e-mailem.";
          break;
        case "ERROR_USER_DISABLED":
        case "user-disabled":
          errorCode = "Użytkownik został wyłączony.";
          break;
        case "ERROR_TOO_MANY_REQUESTS":
        case "operation-not-allowed":
          errorCode = "Zbyt wiele próśb o zalogowanie się na to konto. Spróbuj później.";
          break;
        case "ERROR_OPERATION_NOT_ALLOWED":
        case "operation-not-allowed":
          errorCode = "Błąd serwera, proszę spróbować ponownie później.";
          break;
        case "ERROR_INVALID_EMAIL":
        case "invalid-email":
          errorCode = "Adres e-mail jest nieprawidłowy.";
          break;
        case 'auth/invalid-action-code':
          errorCode = 'Ten link został już użyty. Zaloguj się ponownie.'
          break;
        default:
          errorCode = "Logowanie nie powiodło się. Proszę spróbować ponownie.";
          break;
      }
      this.dialogService.openSimpleDialog( errorCode, 'OK', 'warning' );
      this.router.navigate( ['login'] )
    }
  }

  /**
   * Function to check if token is correct on the server side
   * @returns -boolean that will check if token on the server is correct and tells if user is arleady logged in
   */
  async isLoggedIn(): Promise<boolean> {
    const current_session = { sid: localStorage.getItem( 'sid' ) } as AuthUserRequest;
    console.log( 'sid is before question is: ', current_session.sid )

    try {
      const result = ( await this.http.post( `${this.dataService.apiAdres}/authUser`, current_session ).toPromise() ) as AuthUserReply;
      console.dir( result );

      if ( !result.result ) {
        console.log( 'Deleting cookies..' );
        this.dialogService.openSimpleDialog( 'Utracono połączenie z sesją. Zaloguj się jeszcze raz', 'OK', 'warning' )
        localStorage.clear();
      }

      console.log( 'isLoggedIn() result is: ', result.result )
      return result.result;
    } catch ( error ) {
      this.dialogService.openSimpleDialog(
        'Nawiązanie połączenia z serwerem nie powiodło się. <br/> Proszę sprawdzić połączenie z internetem',
        'OK', 'warning'
      )
      console.dir( error );
      return false;
    }
  }

  /**
   * Function to get user data from firebase and set it as User in DataService.
   * @returns -User data from firebase.
   */
  async setUser() {
    const uid = localStorage.getItem( 'uid' )
    this.dataService.store.doc( `users/${uid}` ).valueChanges().subscribe( u => {
      this.dataService.user = u as User
      console.log( 'User is: ', this.dataService.user )
      this.dataService.navList[1].display = this.dataService.checkIfAdmin()
      this.dataService.store.doc<Sql>( 'config/sql' ).valueChanges().subscribe( sql => {
        this.dataService.sql = sql as Sql
      } )
    } )

  }

  validateEmail( email: String ) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test( String( email ).toLowerCase() );
  }
  /**
   * Functions that will change login cards to login or email-sent
   */
  changeBackToLogin() {
    this.isOnLogin = true;
  }
  changeToEmailSent() {
    this.isOnLogin = false;
  }

  /**
   * @todo -Logout user from app
   */
  logOut() {
    localStorage.clear();
    this.router.navigate( ['login'] )
  }
}

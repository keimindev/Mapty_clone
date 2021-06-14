'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

let map, mapEvent;

class Workout{
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration){
    this.coords = coords;
    this.distance = distance; //in km
    this.duration = duration; //in min
  }

  _setDescription(){
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    //type이 이 블록안에 없지만 사용이 가능한 이유는 setDescription이 각 type이 정의되는곳에서 이용될 것이기때문에
    this.description = `
    ${this.type[0].toUpperCase()}${this.type.slice(1)} on 
    ${months[this.date.getMonth()]}
    ${this.date.getDate()}
    `;
  }

  click() {
    this.clicks ++;
  }
}

class Running extends Workout{
     type = 'running';
  constructor(coords, distance, duration, cadence){
    //super은 부모오브젝트의 함수를 호출할 때 사용
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace(){
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace
  }



}
class Cycling extends Workout{
   type = 'cycling';
  constructor(coords, distance, duration, elevationGain){
    super(coords, distance, duration);
    this.elevationGain = elevationGain;    
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed(){
    //h/km
    this.speed = this.distance / (this.duration / 60 );
    return this.speed
  }
}

const run1 = new Running([39, -12], 5.3, 24, 178)
const cycling1 = new Cycling([39, -12], 53, 24, 178)

////////////////////////////////////////////////////////
//Application architecture
class App {
  //private property
  #map; 
  #mapZoomLevel = 13;
  #workouts = [];
  //생성자 메소드
  constructor(){
    //Get user's position
    //동적인 this를 가진다
    this._getPosition();

    //Get data from Local storage
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this)); 
    //bind는 새로운 함수를 생성한다.this keyword를 설정하고 인자들은 바인드된 함수의 인수에 제공된다.
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this))
  }

  _getPosition(){    
    if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function(){
      alert('Could not get your position')
      });
    }
  }

  _loadMap(position){

    const {latitude} = position.coords;
    const {longitude} = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.#map);
  
    //Handling clicks on map
    this.#map.on('click', this._showForm.bind(this))

    //#workouts 배열에 들어가있는 data를 foreach 하나씩 다시 넣어주는것 
    this.#workouts.forEach(work => {
     //marker은 여기서 바로 로딩이 안된다. 일단 map부터 로딩이 되야함.
      this.renderWorkoutMarker(work);
    //local storage에서온 data는 prototype chain이 아니라 뉴 array다 
   });
  }


  _showForm(mapE){
    this.mapEvent = mapE;
     form.classList.remove('hidden');
     inputDistance.focus();
  }

  _hideForm(){
    //Empty inputs
   inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";

   form.style.display = 'none';
   form.classList.add('hidden');
   setTimeout(() => form.style.display = 'grid', 1000)
  }

  _toggleElevationField(){
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  
  _newWorkout(e) {  
    //helper function   (...array)
    const validInputs = (...inputs) => inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
   e.preventDefault();

   //Get data from form
   //ele value를 새로 정의주고 +는 넘버로 전환해야하기에
   const type = inputType.value;
   const distance = +inputDistance.value;
   const duration = +inputDuration.value;
   const { lat, lng } = this.mapEvent.latlng;
   let workout;
   //If activity running, create running object
   if( type === 'running' ){
     const cadence = +inputCadence.value;
    //check if data is valid 
    //일단 숫자여야함 
    if(
      // !Number.isFinite(distance) || 
      // !Number.isFinite(duration) || 
      // !Number.isFinite(cadence)
      !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) 
      return alert('Input have to be positive numbers!');
      
      //marker된 workout 내용을 보여준다. 
      workout = new Running({lat, lng}, distance, duration, cadence);

   }

   //If activity cycling, create cycling object
   if( type === 'cycling' ){
     const elevation = +inputElevation.value;
   if(!validInputs(distance, duration, elevation) || !allPositive(distance, duration) ) 
      return alert('Input have to be positive numbers!');

      workout = new Cycling ({lat, lng}, distance, duration, elevation);
   }

   //Add new object to workout array
    this.#workouts.push(workout);

   //Render workout on map as market
   this.renderWorkoutMarker(workout);
   //Render workout on list
   this._renderWorkout(workout);

   //Hide form + clear input fields
   this._hideForm();

   //Set Local Storage to all Workouts
   this._setLocalStorage();

  }

  //workout 내용물이 인자 
  renderWorkoutMarker(workout){
   //Render workout on map as market
  //Display marker
    L.marker(workout.coords)
        .addTo(this.#map)
        .bindPopup(L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        }))
        //marker부분에 뜨는 내용
        .setPopupContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`)
        .openPopup(); 

  }

  _renderWorkout(workout){
    let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if(workout.type === 'running')
    html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
          </div>
        </li>    
    `;

    if(workout.type === 'cycling')
    html += `
          <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.speed.toFixed(1)}</span>
            <span class="workout__unit">km/h</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⛰</span>
            <span class="workout__value">${workout.elevationGain}</span>
            <span class="workout__unit">m</span>
          </div>
        </li>   
    `;

    form.insertAdjacentHTML('afterend', html);
  }

 _moveToPopup(e){
  //  e.preventDefault()
   const workoutEl = e.target.closest('.workout');

  //workout 아닌걸 클릭하면 계속 null탄생~return해줘야함
   if(!workoutEl) return;

  const workout = this.#workouts.find(work => work.id === workoutEl.dataset.id);
  
  //leaflet doc에서 찾을 수 있음 
  this.#map.setView(workout.coords, this.#mapZoomLevel, {
    animate: true,
    pan: {
      duration: 1
    }
  });

  //using the public interface
  // workout.click();
 }  

 _setLocalStorage(){
   localStorage.setItem('workouts', JSON.stringify(this.#workouts));
 }
 _getLocalStorage(){
   const data = JSON.parse(localStorage.getItem('workouts'));

   if(!data) return;

   this.#workouts = data;

   //#workouts 배열에 들어가있는 data를 foreach 하나씩 다시 넣어주는것 
   this.#workouts.forEach(work => {
     this._renderWorkout(work);
     //marker은 여기서 바로 로딩이 안된다. 일단 map부터 로딩이 되야함. 그래서 map이 로드될 때로 올려줘야함.
    //  this._renderWorkoutMarker(work);
   });
 }
 reset(){
   localStorage.removeItem('workouts');
   location.reload();
 }
}


const app = new App();




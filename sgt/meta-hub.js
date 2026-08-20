(() => {
  const $ = s => document.querySelector(s);
  const readJson = key => JSON.parse(localStorage.getItem(key) || '[]');
  const toast = text => { const box = $('#toast'); box.textContent = text; box.classList.add('show'); setTimeout(() => box.classList.remove('show'), 1800); };
  const profile = () => JSON.parse(localStorage.getItem('sbs-me') || '{}');
  const hasProfile = () => Object.values(profile()).some(Boolean);
  const defaultPhoto = 'assets/teddy-tv.png';
  const photo = () => localStorage.getItem('sbs-rep-photo') || defaultPhoto;
  const points = () => +(localStorage.getItem('sbs-points') || 240);
  const setPoints = value => localStorage.setItem('sbs-points', Math.max(0, value));
  const people = items => items.length ? items : [];
  const mapPlaces = [
    { title: '망원 작은 극장', subtitle: '1.2 km · 오늘 남은 좌석 12석', detail: '오늘 20:00 상영 · 현장 QR 입장 · 30% 특가', lat: 37.5563, lng: 126.9236 },
    { title: '성수의 작은 호텔', subtitle: '3.8 km · 오늘 체크인 특가', detail: '오늘 1박 · 조식 포함 · AI 예약 가능', lat: 37.5448, lng: 127.0563 }
  ];
  let kakaoMap;
  let mapPositions = [];
  let selectedMapPlace = null;

  function renderKakaoMap() {
    const container = $('#kakaoMap');
    if (!container || !window.kakao?.maps) return;
    if (kakaoMap) return kakaoMap.relayout();
    const center = new window.kakao.maps.LatLng(37.5505, 126.99);
    kakaoMap = new window.kakao.maps.Map(container, { center, level: 8 });
    mapPositions = mapPlaces.map(place => new window.kakao.maps.LatLng(place.lat, place.lng));
    new window.kakao.maps.Polyline({ map: kakaoMap, path: mapPositions, strokeWeight: 3, strokeColor: '#e87482', strokeOpacity: .9, strokeStyle: 'shortdash' });
    mapPlaces.forEach((place, index) => new window.kakao.maps.Marker({ map: kakaoMap, position: mapPositions[index], title: place.title }));
    container.classList.add('map-ready');
  }

  function toggleMapPlace(index) {
    const isClosing = selectedMapPlace === index;
    selectedMapPlace = isClosing ? null : index;
    document.querySelectorAll('.map-sample').forEach((item, itemIndex) => item.classList.toggle('selected', itemIndex === selectedMapPlace));
    if (!isClosing && kakaoMap && mapPositions[index]) {
      kakaoMap.setLevel(4);
      kakaoMap.panTo(mapPositions[index]);
    }
  }

  function addPhotoField() {
    const form = $('#meForm'); if (!form || form.querySelector('#repPhotoInput')) return;
    const field = document.createElement('label'); field.className = 'rep-photo-field';
    field.innerHTML = '나를 표현하는 사진<input id="repPhotoInput" type="file" accept="image/*" /><small>프로필 사진이 아니어도 괜찮아요. 선정적·폭력적·부적절한 이미지는 게시할 수 없습니다.</small>';
    form.querySelector('.primary').before(field);
    field.querySelector('input').addEventListener('change', event => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith('image/')) return toast('이미지 파일만 선택할 수 있어요.'); const reader = new FileReader(); reader.onload = () => { localStorage.setItem('sbs-rep-photo', reader.result); toast('표현 사진을 준비했어요. 저장하면 적용됩니다.'); }; reader.readAsDataURL(file); });
  }
  function displayHub() {
    const data = profile();
    const role = localStorage.getItem('sbs-role') || 'bear';
    $('#hubPhoto').src = photo();
    const name = $('#hubName');
    name.textContent = data.intro || '나의 작은 공간';
    const badge = document.createElement('small');
    badge.className = 'hub-role';
    badge.textContent = role === 'porter' ? 'PORTER' : 'BEAR';
    badge.title = role === 'porter' ? '포터 · 콘텐츠 제작자/자영업자' : '베어 · 일반 사용자';
    name.append(' ', badge);
    $('#hubArea').textContent = `⌖ ${data.area || '활동 지역 미설정'}`; $('#hubInterest').textContent = `# ${data.interest || '관심사 미설정'}`; $('.hub-top small').textContent = `MY SPACE · ${points()} P`; renderHub(); $('#meHub').classList.remove('hidden');
  }
  const pin = item => `<article class="hub-pin"><img src="${item.image || defaultPhoto}" alt="" /><b>${item.title}</b><small>${item.detail || '내가 모은 취향 메모'}</small></article>`;
  function renderHub() {
    const bookmarks = readJson('sbs-bookmarks'), bookings = readJson('sbs-bookings'), likes = readJson('sbs-likes'), hots = readJson('sbs-hots'), rooms = readJson('sbs-rooms');
    $('#hubPins').innerHTML = [...bookmarks, ...bookings].length ? [...bookmarks, ...bookings].map(pin).join('') : '<p class="hub-note">저장한 콘텐츠와 예약이 여기에 핀처럼 쌓여요.</p>';
    $('#hubLikes').innerHTML = likes.length ? likes.map(pin).join('') : '<p class="hub-note">하트를 누른 프로필이 취향 보드에 쌓여요.</p>';
    $('#hubHot').innerHTML = people(hots).length ? hots.map((item, index) => { const mutual = item.mutual || item.title?.includes('윤슬'); return `<article class="match-card"><img src="${item.image || defaultPhoto}" alt="" /><div><b>${item.title}</b><small>${mutual ? '🔥 서로 Hot · 채팅 가능' : 'Hot을 보냈어요 · 상대 응답 대기 중'}</small></div>${mutual ? `<button class="open-match" data-name="${item.title}">채팅</button>` : '<span>대기중</span>'}</article>`; }).join('') : '<p class="hub-note">인연 찾기에서 Hot을 보내면, 서로의 호감이 닿은 인연이 여기에 보여요.</p>';
    $('#hubRooms').innerHTML = rooms.length ? rooms.map(room => { const hours = Math.max(0, Math.ceil((room.expires - Date.now()) / 3600000)); return `<article class="room-card" data-id="${room.id}"><p>${room.title}</p><small>${room.target} · ${hours ? `${hours}시간 뒤 만료` : '유효기간 만료'}</small><div><button class="enter-room">워크스페이스 입장</button><button class="extend-room">15 P · 24시간 연장</button></div></article>`; }).join('') : '<p class="hub-note">아직 보낸 초대장이 없어요. 지정 대상 또는 공개 초대장을 만들어보세요.</p>';
    document.querySelectorAll('.open-match').forEach(button => button.onclick = () => openMutualChat(button.dataset.name));
    document.querySelectorAll('.enter-room').forEach(button => button.onclick = () => openWorkspace(button.closest('.room-card').dataset.id));
    document.querySelectorAll('.extend-room').forEach(button => button.onclick = () => extendRoom(button.closest('.room-card').dataset.id));
  }
  function openMutualChat(name) { $('#chatName').textContent = name; $('#chatLog').innerHTML = '<div class="bubble them">서로 Hot이 닿았어요. 이제 편하게 이야기해요 :)</div>'; $('#chatSheet').classList.remove('hidden'); }
  function openWorkspace(id) { const room = readJson('sbs-rooms').find(x => x.id === id); if (!room) return; $('#chatName').textContent = `워크스페이스 · ${room.title}`; $('#chatLog').innerHTML = `<div class="bubble them">초대장이 열렸어요. ${room.target}와 함께할 수 있는 기간 한정 대화방입니다.</div><div class="bubble them">만료 전에는 누구나 15 P로 24시간 연장할 수 있어요.</div>`; $('#chatSheet').classList.remove('hidden'); }
  function extendRoom(id) { if (points() < 15) return toast('포인트가 부족해요.'); const rooms = readJson('sbs-rooms'); const room = rooms.find(x => x.id === id); if (!room) return; room.expires = Math.max(room.expires, Date.now()) + 86400000; setPoints(points() - 15); renderHub(); toast('워크스페이스를 24시간 연장했어요.'); }
  function sendInvite() { if (points() < 40) return toast('포인트가 부족해요.'); const target = $('#inviteTarget').value === 'public' ? '공개 초대장' : $('#inviteTarget').value; const title = $('#inviteTitle').value.trim() || '함께 이야기할 사람?'; const duration = +$('#inviteDuration').value; const rooms = readJson('sbs-rooms'); rooms.unshift({ id: String(Date.now()), title, target, expires: Date.now() + duration * 3600000 }); localStorage.setItem('sbs-rooms', JSON.stringify(rooms)); setPoints(points() - 40); $('#inviteComposer').classList.add('hidden'); renderHub(); toast('초대장을 보냈어요.'); }
  function selectTab(tab) { document.querySelectorAll('[data-hub-tab]').forEach(button => button.classList.toggle('selected', button.dataset.hubTab === tab)); document.querySelectorAll('[data-panel]').forEach(panel => panel.classList.toggle('hidden', panel.dataset.panel !== tab)); }
  function renderInbox() { const hots = readJson('sbs-hots'); $('#inboxHotList').innerHTML = hots.length ? hots.map(item => { const mutual = item.mutual || item.title?.includes('윤슬') || item.title?.includes('서윤'); return `<article class="match-card"><img src="${item.image || defaultPhoto}" alt="" /><div><b>${item.title}</b><small>${mutual ? '🔥 서로 Hot · 지금 채팅 가능' : 'Hot을 보냈어요 · 상대의 Hot을 기다리는 중'}</small></div>${mutual ? `<button class="inbox-chat" data-name="${item.title}">채팅</button>` : '<span>대기중</span>'}</article>`; }).join('') : '<p class="hub-note">아직 Hot을 보낸 인연이 없어요. 프로필 카드의 🔥 Hot 버튼을 눌러보세요.</p>'; document.querySelectorAll('.inbox-chat').forEach(button => button.onclick = () => openMutualChat(button.dataset.name)); }
  addPhotoField();
  $('#meButton').addEventListener('click', event => { if (!hasProfile()) return; event.preventDefault(); event.stopImmediatePropagation(); displayHub(); }, true);
  $('#closeHub').onclick = () => $('#meHub').classList.add('hidden');
  $('#contentButton').onclick = () => { $('#meHub').classList.add('hidden'); $('#inboxHub').classList.add('hidden'); };
  $('#mapButton').onclick = () => { $('#meHub').classList.add('hidden'); $('#inboxHub').classList.add('hidden'); $('#mapHub').classList.remove('hidden'); requestAnimationFrame(renderKakaoMap); };
  $('#profileButton').onclick = () => { if (hasProfile()) displayHub(); else $('#meButton').click(); };
  $('#inboxButton').onclick = () => { renderInbox(); $('#inboxHub').classList.remove('hidden'); };
  $('#closeInbox').onclick = () => $('#inboxHub').classList.add('hidden');
  $('#closeMap').onclick = () => $('#mapHub').classList.add('hidden');
  window.portbearNavigate = action => {
    $('#bearbotHub')?.classList.add('hidden');
    if (action === 'myPage') { if (hasProfile()) displayHub(); else $('#meButton').click(); return '나의 보드를 열었어요.'; }
    if (action === 'map') { $('#mapButton').click(); return '내 주변 메모 지도를 열었어요.'; }
    if (action === 'hotChat') { $('#inboxButton').click(); return 'Hot 채팅 목록을 열었어요.'; }
    if (action === 'savedNotes') { if (hasProfile()) { displayHub(); selectTab('feed'); } else $('#meButton').click(); return '내가 붙여둔 메모를 열었어요.'; }
    return '아직 지원하지 않는 이동이에요.';
  };
  document.querySelectorAll('.map-place-name').forEach(button => button.onclick = () => toggleMapPlace(+button.dataset.mapPlace));
  $('#hubEdit').onclick = () => { $('#meHub').classList.add('hidden'); $('#meSheet').classList.remove('hidden'); $('#meView').classList.add('hidden'); $('#meForm').classList.remove('hidden'); };
  document.querySelectorAll('[data-hub-tab]').forEach(button => button.onclick = () => selectTab(button.dataset.hubTab));
  $('#newInvite').onclick = () => $('#inviteComposer').classList.toggle('hidden');
  $('#sendInvite').onclick = sendInvite;
})();

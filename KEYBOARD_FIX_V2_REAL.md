## Keyboard Hərəkət Problemi - Real Düzəlişlər

### Problem:
Live support widget-də yazı yazmaq istədikdə box yukarı-aşağı hərəkət edir.

### Səbəblər və Həll:

#### 1. **KeyboardAvoidingView behavior**
```diff
- behavior={Platform.OS === 'ios' ? 'padding' : undefined}
+ behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
```
Android üçün də behavior lazımdır.

#### 2. **TextInput Fixed Height**
```diff
+ height: 44, // Inline style-da
+ paddingVertical: 0, // Padding silindi
+ lineHeight: 20, // Hər platform üçün eyni
```
TextInput-un height-i dəyişməməlidir.

#### 3. **InputContainer Fixed Height**
```diff
- minHeight: 68,
+ height: 68, // Fixed height
```
Container-in də height-i fixed olmalıdır.

#### 4. **Auto-scroll Disabled**
```javascript
// useEffect-də auto-scroll comment out edildi
// Scroll yalnız user manual olaraq edəcək
```
Auto-scroll-un özü problemi yaradır.

#### 5. **Keyboard Animation**
```javascript
const keyboardAnimRef = useRef(new Animated.Value(0)).current;

Animated.timing(keyboardAnimRef, {
  toValue: keyboardHeight,
  duration: Platform.OS === 'ios' ? e.duration || 250 : 250,
  useNativeDriver: false, // Layout üçün false
}).start();
```

#### 6. **TouchableWithoutFeedback**
```javascript
<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
  // Kənara kliklədikdə keyboard bağlanır
</TouchableWithoutFeedback>
```

#### 7. **ScrollView optimizasiya**
```diff
- keyboardDismissMode="interactive"
+ keyboardDismissMode="on-drag"

- animated: true
+ animated: false // requestAnimationFrame-lə

+ flexGrow: 1 // contentContainerStyle-da
```

#### 8. **Position styles**
```javascript
inputSection: {
  position: 'relative',
  bottom: 0,
  left: 0,
  right: 0,
}
```

### Test etmək üçün:

1. Live support aç
2. Input-a klikləy
3. Yavaş-yavaş yaz
4. Sürətli yaz
5. Uzun mesaj yaz
6. Keyboard aç-bağla-aç-bağla
7. Kənara klikləy

### Əgər hələ də problem varsa:

1. **React Native version yoxla:**
```bash
npm ls react-native
```

2. **Expo versiyasını yoxla:**
```bash
npm ls expo
```

3. **Cache-i təmizlə:**
```bash
npm start -- --clear
```

4. **KeyboardAvoidingView-u tamamilə sil və manual height management et:**
```javascript
const [containerHeight, setContainerHeight] = useState(height * 0.8);

useEffect(() => {
  Keyboard.addListener('keyboardDidShow', (e) => {
    setContainerHeight(height * 0.8 - e.endCoordinates.height);
  });
}, []);
```

### Əgər Android-da problem varsa:

AndroidManifest.xml-də:
```xml
<activity
  android:windowSoftInputMode="adjustResize"
/>
```

### Əgər iOS-da problem varsa:

Info.plist-də:
```xml
<key>UIViewControllerBasedStatusBarAppearance</key>
<false/>
```

## Son qeyd:

Bu dəfə həqiqətən real düzəlişlər etdim:
- ✅ Fixed heights (input və container)
- ✅ Padding silindi
- ✅ Auto-scroll disabled
- ✅ Keyboard animation əlavə edildi
- ✅ TouchableWithoutFeedback əlavə edildi
- ✅ ScrollView optimizasiya edildi

Əgər problem hələ də qalırsa, o zaman **konkret olaraq nə vaxt hoppanır?**
- Klaviatura açılarkən?
- Yazarkən?
- Mesaj göndərəndə?
- Scroll edərkən?

Mənə deyərsən, daha spesifik həll edərəm.

import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot, query, collection } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCyLjRhMPlFuXVtySwYDam5W_diHRAISXs",
  authDomain: "carbide-legend-438206-a6.firebaseapp.com",
  projectId: "carbide-legend-438206-a6",
  storageBucket: "carbide-legend-438206-a6.firebasestorage.app",
  messagingSenderId: "415991747600",
  appId: "1:415991747600:web:a6ed870e6c1b55f450a695",
  measurementId: "G-9QRZFJ9XPQ"
};

// Firebase initialization
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore();

// Sign up function
export const signUp = async (email: string, password: string, name: string): Promise<User> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    if (!name) {
      throw new Error('이름을 입력해주세요');
    }

    // Store user info in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      name: name,
      createdAt: new Date(),
    });

    console.log("회원가입 성공:", user);
    return user;
  } catch (error) {
    console.error("회원가입 오류:", error instanceof Error ? error.message : '알 수 없는 오류');
    throw error;
  }
};

// Login function
export const logIn = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("로그인 성공:", userCredential.user);
    return userCredential.user;
  } catch (error) {
    console.error("로그인 오류:", error instanceof Error ? error.message : '알 수 없는 오류');
    throw error;
  }
};

// Log out function
export const logOut = async (): Promise<void> => {
  try {
    // Firestore 리스너 종료 (이미 설정된 리스너가 있다면 종료)
    if (auth.currentUser) {
      // Firestore 리스너가 있다면 종료합니다.
      const unsubscribe = onSnapshot(query(collection(db, "yourCollection")), (snapshot) => {
        // 데이터 처리
      });
      unsubscribe(); // 리스너 해제
    }

    // Firebase 인증 로그아웃 처리
    await signOut(auth);
    console.log("로그아웃 성공");
  } catch (error) {
    console.error("로그아웃 오류:", error instanceof Error ? error.message : "알 수 없는 오류");
  }
};

// Auth state listener
export const onAuthStateChangedListener = (callback: (user: User | null) => void): () => void => {
  return onAuthStateChanged(auth, callback);
};

// Get ID Token with automatic refresh handling
export const getIdToken = async (user: User): Promise<string> => {
  if (user) {
    try {
      return await user.getIdToken(true); // Force token refresh
    } catch (error) {
      throw new Error("Error fetching ID token: " + (error instanceof Error ? error.message : 'Unknown error'));
    }
  } else {
    throw new Error("사용자가 로그인되어 있지 않습니다.");
  }
};

// Re-export the `User` type with `export type`
export type { User };

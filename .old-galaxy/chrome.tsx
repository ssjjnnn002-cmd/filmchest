import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Keyboard, Modal, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'
import { BlurView } from 'expo-blur'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from './theme'

const ToastContext = createContext<(message: string) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ChromeProvider({ children }: { children: ReactNode }) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const [message, setMessage] = useState<string>()
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(undefined), 2600)
    return () => clearTimeout(timer)
  }, [message])
  return (
    <ToastContext.Provider value={setMessage}>
      {children}
      {message ? (
        <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 96, alignItems: 'center' }}>
          <View style={{ maxWidth: '100%', borderRadius: 999, overflow: 'hidden', borderWidth: 0.5, borderColor: c.glassLine }}>
            <BlurView intensity={28} tint={c.dark ? 'dark' : 'light'} style={{ backgroundColor: c.glass, paddingHorizontal: 20, paddingVertical: 12 }}>
              <Text style={{ color: c.ink, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>{message}</Text>
            </BlurView>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  )
}

function Pill({ label, onPress, tone, disabled }: { label: string; onPress: () => void; tone?: 'accent'; disabled?: boolean }) {
  const c = useTheme()
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => ({
      height: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.glass, borderWidth: 0.5, borderColor: c.glassLine, opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
    })}>
      <Text style={{ color: tone === 'accent' ? c.safelight : c.ink, fontSize: 17, fontWeight: tone === 'accent' ? '700' : '500' }}>{label}</Text>
    </Pressable>
  )
}

/** 웹앱과 같은 아래 시트. 화면 위에 올리고, 바깥을 누르면 닫힌다. */
export function Sheet({ title, onClose, right, onRight, rightDisabled, tall, children }: {
  title: string
  onClose: () => void
  right?: string
  onRight?: () => void
  rightDisabled?: boolean
  tall?: boolean
  children: ReactNode
}) {
  const c = useTheme()
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  const [keyboard, setKeyboard] = useState(0)
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'
    const show = Keyboard.addListener(showEvent, (e) => setKeyboard(e.endCoordinates.height))
    const hide = Keyboard.addListener(hideEvent, () => setKeyboard(0))
    return () => { show.remove(); hide.remove() }
  }, [])
  const limit = Math.round(height - Math.max(insets.top, 12) - 8 - keyboard)
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: keyboard }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />
        <View style={{
          maxHeight: limit, height: tall ? limit : undefined, backgroundColor: c.paper,
          borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden',
          paddingBottom: keyboard > 0 ? 12 : insets.bottom + 12,
        }}>
          <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: c.faint, opacity: 0.6, alignSelf: 'center', marginTop: 6 }} />
          <View style={{ minHeight: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, alignItems: 'flex-start' }}><Pill label="닫기" onPress={onClose} /></View>
            <Text style={{ color: c.ink, fontSize: 17, fontWeight: '600', maxWidth: '46%' }} numberOfLines={1}>{title}</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {right ? <Pill label={right} tone="accent" disabled={rightDisabled} onPress={() => onRight?.()} /> : null}
            </View>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 22 }} style={tall ? { flex: 1 } : { flexGrow: 0 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

export function Confirm({ message, action = '삭제', onConfirm, onCancel }: {
  message: string
  action?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const c = useTheme()
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onCancel} statusBarTranslucent>
      <Pressable onPress={onCancel} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Pressable style={{ width: '100%', maxWidth: 320, borderRadius: 28, overflow: 'hidden' }}>
          <BlurView intensity={40} tint={c.dark ? 'dark' : 'light'} style={{ backgroundColor: c.glass, paddingTop: 22, paddingHorizontal: 18, paddingBottom: 16 }}>
            <Text style={{ color: c.ink, fontSize: 17, fontWeight: '600', textAlign: 'center', lineHeight: 23, marginBottom: 16 }}>{message}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={onCancel} style={{ flex: 1, height: 48, borderRadius: 999, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: c.ink, fontSize: 17, fontWeight: '600' }}>취소</Text>
              </Pressable>
              <Pressable onPress={onConfirm} style={{ flex: 1, height: 48, borderRadius: 999, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: c.danger, fontSize: 17, fontWeight: '600' }}>{action}</Text>
              </Pressable>
            </View>
          </BlurView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

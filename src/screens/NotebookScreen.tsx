import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header, HeaderIconButton } from '../components/Header';
import { Icon } from '../components/Icon';
import { isMalayalam, scriptureFont } from '../fonts';
import { useT } from '../i18n';
import { pageName, useNotebook } from '../notebook';
import { useSettings } from '../settings';
import { MAX_CONTENT_WIDTH } from '../text';
import { useTheme } from '../theme';

interface Props {
  onOpenPage: (id: string, isNew?: boolean) => void;
  onBack: () => void;
}

/** The notebook's pages, the most recently edited first. */
export function NotebookScreen({ onOpenPage, onBack }: Props) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { pages, create } = useNotebook();
  const newPage = () => onOpenPage(create(), true);
  const font = (text: string, bold = false) => scriptureFont(isMalayalam(text), false, bold);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Header title={t('notebook')} onBack={onBack} right={<HeaderIconButton icon="note_add" onPress={newPage} accessibilityLabel={t('newPage')} />} />
      {pages.length === 0 ? (
        <View style={styles.emptyBox}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}>
            <Icon name="note_stack" size={36} color={theme.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{t('notebookEmptyTitle')}</Text>
          <Text style={[styles.empty, { color: theme.muted }]}>{t('notebookEmpty')}</Text>
          <Pressable onPress={newPage} accessibilityRole="button" style={[styles.newButton, { backgroundColor: theme.accent }]}>
            <Icon name="add" size={20} color={theme.onAccent} />
            <Text style={[styles.newButtonText, { color: theme.onAccent }]}>{t('newPage')}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={pages}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          renderItem={({ item }) => {
            const name = pageName(item, t('untitled'));
            // The first lines after the one used as the name.
            const rest = item.title.trim() ? item.body : item.body.split('\n').slice(1).join('\n');
            const preview = rest.replace(/\s+/g, ' ').trim();
            const date = new Date(item.updated).toLocaleDateString(settings.language === 'ml' ? 'ml-IN' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            return (
              <Pressable
                onPress={() => onOpenPage(item.id)}
                android_ripple={{ color: theme.accentSoft }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.row, { borderBottomColor: theme.border, backgroundColor: pressed ? theme.accentSoft : 'transparent' }]}
              >
                <Text style={[styles.name, { color: theme.text, fontFamily: font(name, true), fontWeight: isMalayalam(name) ? 'normal' : '600' }]} numberOfLines={1}>
                  {name}
                </Text>
                {preview ? (
                  <Text style={[styles.preview, { color: theme.muted, fontFamily: font(preview) }]} numberOfLines={2}>
                    {preview}
                  </Text>
                ) : null}
                <Text style={[styles.date, { color: theme.muted }]}>{t('pageEdited', { date })}</Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { alignSelf: 'center', width: '100%', maxWidth: MAX_CONTENT_WIDTH },
  row: { paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 3 },
  name: { fontSize: 17 },
  preview: { fontSize: 15, lineHeight: 22 },
  date: { fontSize: 12, marginTop: 2 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, paddingBottom: 96 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '500', marginBottom: 8, textAlign: 'center' },
  empty: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 340 },
  newButton: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16, paddingRight: 20, minHeight: 44, borderRadius: 22 },
  newButtonText: { fontSize: 16, fontWeight: '600' },
});

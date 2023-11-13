import React from 'react'
import {Pressable, StyleProp, StyleSheet, View, ViewStyle} from 'react-native'
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {Text} from '../util/text/Text'
import {RichText} from '../util/text/RichText'
import {usePalette} from 'lib/hooks/usePalette'
import {s} from 'lib/styles'
import {UserAvatar} from '../util/UserAvatar'
import {observer} from 'mobx-react-lite'
import {useNavigation} from '@react-navigation/native'
import {NavigationProp} from 'lib/routes/types'
import {pluralize} from 'lib/strings/helpers'
import {AtUri} from '@atproto/api'
import * as Toast from 'view/com/util/Toast'
import {sanitizeHandle} from 'lib/strings/handles'
import {logger} from '#/logger'
import {useModalControls} from '#/state/modals'
import {
  usePreferencesQuery,
  useSaveFeedMutation,
  useRemoveFeedMutation,
} from '#/state/queries/preferences'
import {useFeedSourceInfoQuery} from '#/state/queries/feed'

export const FeedSourceCard = observer(function FeedSourceCardImpl({
  feedUri,
  style,
  showSaveBtn = false,
  showDescription = false,
  showLikes = false,
}: {
  feedUri: string
  style?: StyleProp<ViewStyle>
  showSaveBtn?: boolean
  showDescription?: boolean
  showLikes?: boolean
}) {
  const pal = usePalette('default')
  const navigation = useNavigation<NavigationProp>()
  const {openModal} = useModalControls()
  const {data: preferences} = usePreferencesQuery()
  const {data: info} = useFeedSourceInfoQuery({uri: feedUri})
  const {isPending: isSavePending, mutateAsync: saveFeed} =
    useSaveFeedMutation()
  const {isPending: isRemovePending, mutateAsync: removeFeed} =
    useRemoveFeedMutation()

  const isSaved = Boolean(preferences?.feeds?.saved?.includes(feedUri))

  const onToggleSaved = React.useCallback(async () => {
    // Only feeds can be un/saved, lists are handled elsewhere
    if (info?.type !== 'feed') return

    if (isSaved) {
      openModal({
        name: 'confirm',
        title: 'Remove from my feeds',
        message: `Remove ${info?.displayName} from my feeds?`,
        onPressConfirm: async () => {
          try {
            await removeFeed({uri: feedUri})
            // await item.unsave()
            Toast.show('Removed from my feeds')
          } catch (e) {
            Toast.show('There was an issue contacting your server')
            logger.error('Failed to unsave feed', {error: e})
          }
        },
      })
    } else {
      try {
        await saveFeed({uri: feedUri})
        Toast.show('Added to my feeds')
      } catch (e) {
        Toast.show('There was an issue contacting your server')
        logger.error('Failed to save feed', {error: e})
      }
    }
  }, [isSaved, openModal, info, feedUri, removeFeed, saveFeed])

  if (!info || !preferences) return null

  return (
    <Pressable
      testID={`feed-${info.displayName}`}
      accessibilityRole="button"
      style={[styles.container, pal.border, style]}
      onPress={() => {
        if (info.type === 'feed') {
          navigation.push('ProfileFeed', {
            name: info.creatorDid,
            rkey: new AtUri(info.uri).rkey,
          })
        } else if (info.type === 'list') {
          navigation.push('ProfileList', {
            name: info.creatorDid,
            rkey: new AtUri(info.uri).rkey,
          })
        }
      }}
      key={info.uri}>
      <View style={[styles.headerContainer]}>
        <View style={[s.mr10]}>
          <UserAvatar type="algo" size={36} avatar={info.avatar} />
        </View>
        <View style={[styles.headerTextContainer]}>
          <Text style={[pal.text, s.bold]} numberOfLines={3}>
            {info.displayName}
          </Text>
          <Text style={[pal.textLight]} numberOfLines={3}>
            {info.type === 'feed' ? 'Feed' : 'List'} by{' '}
            {sanitizeHandle(info.creatorHandle, '@')}
          </Text>
        </View>

        {showSaveBtn && info.type === 'feed' && (
          <View>
            <Pressable
              disabled={isSavePending || isRemovePending}
              accessibilityRole="button"
              accessibilityLabel={
                isSaved ? 'Remove from my feeds' : 'Add to my feeds'
              }
              accessibilityHint=""
              onPress={onToggleSaved}
              hitSlop={15}
              style={styles.btn}>
              {isSaved ? (
                <FontAwesomeIcon
                  icon={['far', 'trash-can']}
                  size={19}
                  color={pal.colors.icon}
                />
              ) : (
                <FontAwesomeIcon
                  icon="plus"
                  size={18}
                  color={pal.colors.link}
                />
              )}
            </Pressable>
          </View>
        )}
      </View>

      {showDescription && info.description ? (
        <RichText
          style={[pal.textLight, styles.description]}
          richText={info.description}
          numberOfLines={3}
        />
      ) : null}

      {showLikes && info.type === 'feed' ? (
        <Text type="sm-medium" style={[pal.text, pal.textLight]}>
          Liked by {info.likeCount || 0}{' '}
          {pluralize(info.likeCount || 0, 'user')}
        </Text>
      ) : null}
    </Pressable>
  )
})

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 18,
    paddingVertical: 20,
    flexDirection: 'column',
    flex: 1,
    borderTopWidth: 1,
    gap: 14,
  },
  headerContainer: {
    flexDirection: 'row',
  },
  headerTextContainer: {
    flexDirection: 'column',
    columnGap: 4,
    flex: 1,
  },
  description: {
    flex: 1,
    flexWrap: 'wrap',
  },
  btn: {
    paddingVertical: 6,
  },
})
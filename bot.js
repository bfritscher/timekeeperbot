// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
const {
    TurnContext,
    TeamsActivityHandler,
    MessageFactory,
    CardFactory,
    TeamsInfo
} = require('botbuilder');

const reactionLookup = {
    like: 'merci pour ton 👍',
    heart: '❤️ you too',
    laugh: "Moi aussi j'aime rire.<br><img src='https://www.blagues-en-stock.org/_media/img/medium/quand-tu-allumes-la-webcam-2.jpg'>",
    surprised: 'moi aussi je suis tout <br><img src="https://media.giphy.com/media/vQqeT3AYg8S5O/giphy.gif">',
    sad: 'désolé que tu sois 😟',
    angry: 'désolé que tu sois 😡'
};

class TimeKeeperBot extends TeamsActivityHandler {
    constructor(addJob) {
        super();
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            TurnContext.removeRecipientMention(context.activity);
            const text = context.activity.text.trim().toLocaleLowerCase();
            const conversationReference = TurnContext.getConversationReference(context.activity);
            const m = text.match(/(\d\d):(\d\d)/);
            if (m) {
                const title = encodeURI(text.split(',')[0].replace(/<\/?[^>]+(>|$)/g, ''));
                const min = parseInt(m[1], 10);
                const sec = parseInt(m[2], 10);
                const duration = ((min * 60) + sec) * 1000;
                const datelocal = new Date(context.activity.rawLocalTimestamp.slice(0, 19));
                datelocal.setTime(datelocal.getTime() + duration);
                const localISOTime = datelocal.toISOString().slice(0, 19);
                const replyText = `Voici le [minuteur de ${ m[0] }](https://vclock.com/embed/timer/#countdown=00:${ min }:${ sec }&date=${ localISOTime }&onzero=2&title=${ title }&showmessage=0&theme=1&ampm=0&sound=harp)`;
                await context.sendActivity(MessageFactory.text(replyText, replyText));
                if (duration > 30000) {
                    addJob(conversationReference, 'Il reste 30 secondes', duration - 30000);
                }
                const card = CardFactory.heroCard(
                    "C'est terminé!",
                    ['https://media.giphy.com/media/upg0i1m4DLe5q/giphy.gif']
                );
                const message = MessageFactory.attachment(card);
                addJob(conversationReference, message, duration);
            } else {
                await context.sendActivity(MessageFactory.text('Désolé, je sais uniquement créer des minuteurs au format mm:ss'));
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onReactionsAdded(async (context, next) => {
            const reactionsAdded = context.activity.reactionsAdded;
            if (reactionsAdded && reactionsAdded.length > 0) {
                for (let i = 0; i < reactionsAdded.length; i++) {
                    const reaction = reactionsAdded[i];
                    if (!Object.keys(reactionLookup).includes(reaction.type)) {
                        console.log(`Unknoen reaction: ${ reaction.type }`);
                        return;
                    }
                    try {

                        const member = await TeamsInfo.getMember(context, context.activity.from.id);
                        const message = MessageFactory.text(`Salut ${ member.givenName }, ${ reactionLookup[reaction.type] }`);
                        const ref = TurnContext.getConversationReference(context.activity);
                        ref.user = member;

                        await context.adapter.createConversation(ref,
                            async (t1) => {
                                const ref2 = TurnContext.getConversationReference(t1.activity);
                                await t1.adapter.continueConversation(ref2, async (t2) => {
                                    await t2.sendActivity(message);
                                });
                            });
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        });
    }
}

module.exports.TimeKeeperBot = TimeKeeperBot;
